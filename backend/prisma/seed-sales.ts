import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();
const days = 60;
const customerCount = 24;
const hours = [8, 8, 9, 10, 11, 11, 12, 12, 13, 14, 15, 16];
const customerIds = Array.from({ length: customerCount }, (_, index) => `0000739900${String(index + 1).padStart(3, '0')}`);
const isCheck = process.argv.includes('--check');

function bangkokToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

function makeSales(merchants: { Mch_ID: number; Dist_ID: number }[], customers: { User_ID: number }[]) {
  const today = bangkokToday();
  return merchants.flatMap((merchant, shop) => Array.from({ length: days }, (_, index) => {
    const date = new Date(today - (index + 1) * 86400000);
    const dateText = date.toISOString().slice(0, 10);
    const epochDay = Math.floor(date.getTime() / 86400000);
    const weekend = [0, 6].includes(date.getUTCDay());
    const quietSlot = [14, 16, 10][shop % 3];
    return hours.flatMap((hour, bill) => {
      const quiet = Math.floor(hour / 2) * 2 === quietSlot;
      if (quiet && (index + shop + bill) % 3 !== 0) return [];
      const total = Math.round((quiet ? 75 : 170 + (index * 7 + shop * 17 + bill * 13) % 120) * (weekend && shop % 2 === 0 ? 1.3 : 1));
      return [{
        Tx_ID: 9_000_000_000_000n + BigInt(merchant.Mch_ID) * 1_000_000_000n + BigInt(epochDay) * 100n + BigInt(bill),
        User_ID: customers[(shop * 7 + index * 3 + bill) % customers.length].User_ID,
        Merchant_ID: merchant.Mch_ID,
        District_ID: merchant.Dist_ID,
        Total_Amount: total,
        User_Paid_Amount: total * 0.4,
        Gov_Subsidized_Amount: total * 0.6,
        Tx_Timestamp: new Date(`${dateText}T${String(hour).padStart(2, '0')}:${String((bill * 11 + shop * 3) % 60).padStart(2, '0')}:00+07:00`),
        Status: 'COMPLETED',
      }];
    });
  }).flat());
}

async function main() {
  const merchants = await prisma.merchants.findMany({
    where: { Shop_Name: { startsWith: '[จำลอง]' } },
    select: { Mch_ID: true, Shop_Name: true, Dist_ID: true },
    orderBy: { Mch_ID: 'asc' },
  });
  assert(merchants.length > 0, 'No [จำลอง] merchants found; refusing to seed real shops.');
  console.log(`Found ${merchants.length} demo shops; generating sales for the previous ${days} complete Bangkok days.`);

  if (isCheck) {
    const sales = makeSales(merchants, Array.from({ length: customerCount }, (_, User_ID) => ({ User_ID: User_ID + 1 })));
    assert.equal(new Set(sales.map(sale => sale.Tx_ID.toString())).size, sales.length);
    console.log(`Dry run: ${sales.length} deterministic sales, ${customerCount} dedicated demo customers; database unchanged.`);
    return;
  }

  await prisma.users.createMany({
    data: customerIds.map((Citizen_ID, index) => ({
      Citizen_ID,
      Phone: `0007399${String(index + 1).padStart(3, '0')}`,
      Name: `[จำลอง] ลูกค้าทดสอบ ${index + 1}`,
      Password: randomUUID(),
      Role: 'USER',
    })),
    skipDuplicates: true,
  });
  const customers = await prisma.users.findMany({ where: { Citizen_ID: { in: customerIds } }, select: { User_ID: true, Citizen_ID: true, Name: true }, orderBy: { Citizen_ID: 'asc' } });
  assert.equal(customers.length, customerCount);
  assert(customers.every(customer => customer.Name?.startsWith('[จำลอง] ลูกค้าทดสอบ')), 'Reserved demo identifier belongs to a different user.');
  const sales = makeSales(merchants, customers);
  assert.equal(new Set(sales.map(sale => sale.Tx_ID.toString())).size, sales.length);

  let created = 0;
  for (let index = 0; index < sales.length; index += 400) {
    const batch = sales.slice(index, index + 400);
    const existing = await prisma.sales_transactions.findMany({
      where: { Tx_ID: { in: batch.map(sale => sale.Tx_ID) } },
      select: { Tx_ID: true, User_ID: true, Merchant_ID: true, Total_Amount: true, Tx_Timestamp: true },
    });
    for (const row of existing) {
      const expected = batch.find(sale => sale.Tx_ID === row.Tx_ID)!;
      assert(row.User_ID === expected.User_ID && row.Merchant_ID === expected.Merchant_ID &&
        Number(row.Total_Amount) === expected.Total_Amount && row.Tx_Timestamp.getTime() === expected.Tx_Timestamp.getTime(),
      `Transaction ID ${row.Tx_ID} belongs to different data; stopping.`);
    }
    created += (await prisma.sales_transactions.createMany({ data: batch, skipDuplicates: true })).count;
  }
  console.log(`Created ${created} sales; ${sales.length} expected demo sales now exist for ${merchants.length} shops.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
