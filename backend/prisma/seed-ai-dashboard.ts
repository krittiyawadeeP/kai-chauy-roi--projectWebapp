import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { campaignWeek, rankWeeklyMerchants, runWeeklyMissionAnalysis } from '../src/lib/weekly-mission-job';
import { bangkokDate } from '../src/lib/sales-mission';
import { findProvince } from '../../shared/regions';
import { merchantCategory } from '../src/lib/merchant-category';

const prisma = new PrismaClient();
const check = process.argv.includes('--check');
const dayMs = 86_400_000;
// shortcut: fixed 42-day sales cycle keeps repeated seeding consistent; change the anchor only with a new identifier range.
const salesCycleAnchor = Date.parse('2026-09-13T00:00:00.000Z') / dayMs;
const customerCount = 24;
const customerCitizenId = (index: number) => `0000999000${String(index + 1).padStart(3, '0')}`;
const customerPhone = (index: number) => `000999000${String(index + 1).padStart(3, '0')}`;
const merchantCitizenId = (code: string, index: number) => `0000998${code}${String(index + 1).padStart(4, '0')}`;
const merchantPhone = (code: string, index: number) => `000998${code}${String(index + 1).padStart(4, '0')}`;

type Shop = { provinceId: number; provinceName: string; code: string; districtId: number; districtName: string; index: number; name: string; category: ReturnType<typeof merchantCategory> };
type SeedMerchant = { Mch_ID: number; Dist_ID: number; shop: Shop };

function salesFor(merchant: SeedMerchant, customers: { User_ID: number }[], analysisEnd: Date) {
  return Array.from({ length: 42 }, (_, dayIndex) => {
    const localDate = new Date(analysisEnd.getTime() - (dayIndex + 1) * dayMs + 7 * 3_600_000).toISOString().slice(0, 10);
    const epochDay = Math.floor(Date.parse(`${localDate}T00:00:00.000Z`) / dayMs);
    const recent = ((epochDay - salesCycleAnchor) % 42 + 42) % 42 >= 28;
    const hours = merchant.shop.index === 0 ? [10, 12, 14] : [9, 11, 16];
    const amounts = recent ? merchant.shop.index === 0 ? [95, 75, 35] : [105, 80, 40] : merchant.shop.index === 0 ? [250, 190, 125] : [270, 210, 135];
    return hours.map((hour, bill) => {
      const amount = amounts[bill];
      return {
        Tx_ID: 8_000_000_000_000_000n + BigInt(merchant.Mch_ID) * 1_000_000_000n + BigInt(epochDay) * 10n + BigInt(bill),
        User_ID: customers[(merchant.Mch_ID + dayIndex + bill) % customers.length].User_ID,
        Merchant_ID: merchant.Mch_ID, District_ID: merchant.Dist_ID,
        Total_Amount: amount, User_Paid_Amount: amount, Gov_Subsidized_Amount: 0,
        Tx_Timestamp: new Date(`${localDate}T${String(hour).padStart(2, '0')}:${String(10 + bill * 11).padStart(2, '0')}:00+07:00`),
        Status: 'COMPLETED',
      };
    });
  }).flat();
}

async function main() {
  const { start, analysisEnd } = campaignWeek();
  if (process.argv.includes('--analyze-only')) {
    await runWeeklyMissionAnalysis();
    const missions = await prisma.missions.count({ where: { Campaign_Week_Start: new Date(`${bangkokDate(start)}T00:00:00.000Z`), Status: 'ACTIVE' } });
    console.log(`Weekly analysis complete: ${missions} missions for campaign week ${bangkokDate(start)}.`);
    return;
  }
  const provinces = await prisma.provinces.findMany({ include: { districts: { orderBy: { Dist_ID: 'asc' } } }, orderBy: { Prov_ID: 'asc' } });
  const known = provinces.map(province => ({ province, reference: findProvince(province.Prov_Name) }));
  assert.equal(known.length, 77, 'Expected all 77 provinces in the database');
  assert(known.every(row => row.reference && row.province.districts.length > 0), 'Every province needs a recognized name and at least one district');
  assert.equal(new Set(known.map(row => row.reference!.code)).size, 77, 'Province names must map to 77 distinct codes');
  const shops: Shop[] = known.flatMap(({ province, reference }) => [0, 1].map(index => {
    const district = province.districts[Math.min(index, province.districts.length - 1)];
    return {
      provinceId: province.Prov_ID, provinceName: province.Prov_Name, code: reference!.code,
      districtId: district.Dist_ID, districtName: district.Dist_Name, index,
      name: index === 0 ? `ครัวบ้าน${district.Dist_Name} ${province.Prov_Name}` : `ของดีชุมชน${district.Dist_Name} ${province.Prov_Name}`,
      category: merchantCategory(index === 0 ? 'อาหารและเครื่องดื่ม' : 'ของใช้ทั่วไป'),
    };
  }));
  assert.equal(shops.length, 154);
  const ids = shops.map(shop => merchantCitizenId(shop.code, shop.index));
  assert.equal(new Set(ids).size, ids.length);
  assert(ids.every(id => id.length === 13));
  const existingUsers = await prisma.users.findMany({ where: { Citizen_ID: { in: ids } }, include: { merchants: true } });
  const byCitizenId = new Map(existingUsers.map(user => [user.Citizen_ID, user]));
  for (const shop of shops) {
    const existing = byCitizenId.get(merchantCitizenId(shop.code, shop.index));
    if (!existing) continue;
    assert(existing.Role === 'MERCHANT' && existing.Phone === merchantPhone(shop.code, shop.index) && existing.merchants.length === 1 && existing.merchants[0].Shop_Name === shop.name && existing.merchants[0].Dist_ID === shop.districtId,
      `Reserved account for ${shop.provinceName} belongs to different data; stopping`);
  }
  const fakeMerchants = shops.map((shop, index) => ({ Mch_ID: index + 1, Dist_ID: shop.districtId, shop }));
  const fakeCustomers = Array.from({ length: customerCount }, (_, index) => ({ User_ID: index + 1 }));
  const example = fakeMerchants.slice(0, 2).map(merchant => {
    const rows = salesFor(merchant, fakeCustomers, analysisEnd);
    return { id: merchant.Mch_ID, districtId: merchant.Dist_ID, recent: rows.filter(row => row.Tx_Timestamp >= new Date(analysisEnd.getTime() - 14 * dayMs)), reference: rows.filter(row => row.Tx_Timestamp < new Date(analysisEnd.getTime() - 14 * dayMs)) };
  });
  assert.equal(rankWeeklyMerchants(example).length, 2, 'Generated sales must make both shops eligible');
  if (check) {
    const existingMissions = await prisma.missions.findMany({ where: { Campaign_Week_Start: new Date(`${bangkokDate(start)}T00:00:00.000Z`), Status: 'ACTIVE' }, select: { Max_Recipients: true, Daily_Start_Minute: true, Daily_End_Minute: true, Selection_Evidence: true, merchants: { select: { districts: { select: { Prov_ID: true } } } } } });
    const missionCounts = new Map<number, number>();
    for (const mission of existingMissions) {
      const provinceId = mission.merchants.districts.Prov_ID;
      missionCounts.set(provinceId, (missionCounts.get(provinceId) ?? 0) + 1);
    }
    const underfilled = known.filter(row => (missionCounts.get(row.province.Prov_ID) ?? 0) < 2).map(row => row.province.Prov_Name);
    const seedMerchantIds = existingUsers.flatMap(user => user.merchants.map(merchant => merchant.Mch_ID));
    const existingSales = seedMerchantIds.length ? await prisma.sales_transactions.count({ where: { Merchant_ID: { in: seedMerchantIds }, Tx_Timestamp: { gte: new Date(analysisEnd.getTime() - 42 * dayMs), lt: analysisEnd } } }) : 0;
    const selectedSeedShops = seedMerchantIds.length ? await prisma.missions.count({ where: { Campaign_Week_Start: new Date(`${bangkokDate(start)}T00:00:00.000Z`), Status: 'ACTIVE', Target_Merchant_ID: { in: seedMerchantIds } } }) : 0;
    assert([...missionCounts.values()].every(count => count <= 2), 'A province has more than two weekly missions');
    assert(existingMissions.every(mission => mission.Max_Recipients === null && mission.Daily_Start_Minute !== null && mission.Daily_End_Minute === mission.Daily_Start_Minute + 120 && Number((mission.Selection_Evidence as { ratio?: number } | null)?.ratio) <= 0.8), 'A weekly mission does not match the expected AI rule');
    console.log(`Campaign week ${bangkokDate(start)}: 77 provinces, ${shops.length} shops (${shops.length - existingUsers.length} new), ${existingSales}/${shops.length * 42 * 3} sales, ${customerCount} customers; ${existingMissions.length} missions across ${missionCounts.size} provinces (${selectedSeedShops} seeded shops selected). Missing: ${underfilled.join(', ') || 'none'}. Database unchanged.`);
    return;
  }

  await prisma.users.createMany({ data: Array.from({ length: customerCount }, (_, index) => ({ Citizen_ID: customerCitizenId(index), Phone: customerPhone(index), Password: randomUUID(), Role: 'USER' })), skipDuplicates: true });
  const customers = await prisma.users.findMany({ where: { Citizen_ID: { in: Array.from({ length: customerCount }, (_, index) => customerCitizenId(index)) } }, select: { User_ID: true, Citizen_ID: true, Phone: true }, orderBy: { Citizen_ID: 'asc' } });
  assert.equal(customers.length, customerCount);
  assert(customers.every((customer, index) => customer.Citizen_ID === customerCitizenId(index) && customer.Phone === customerPhone(index)), 'Reserved customer identifier belongs to another account');

  const merchants: SeedMerchant[] = [];
  for (const shop of shops) {
    const existing = byCitizenId.get(merchantCitizenId(shop.code, shop.index));
    const merchant = existing?.merchants[0] ?? (await prisma.users.create({
      data: {
        Citizen_ID: merchantCitizenId(shop.code, shop.index), Phone: merchantPhone(shop.code, shop.index), Password: randomUUID(),
        Role: 'MERCHANT', Province_ID: shop.provinceId,
        merchants: { create: { Shop_Name: shop.name, Category: shop.category, Dist_ID: shop.districtId, wallet: { create: {} } } },
      }, include: { merchants: true },
    })).merchants[0];
    merchants.push({ Mch_ID: merchant.Mch_ID, Dist_ID: merchant.Dist_ID, shop });
  }
  const sales = merchants.flatMap(merchant => salesFor(merchant, customers, analysisEnd));
  assert.equal(new Set(sales.map(row => row.Tx_ID.toString())).size, sales.length);
  let created = 0;
  for (let index = 0; index < sales.length; index += 400) {
    const batch = sales.slice(index, index + 400);
    const existing = await prisma.sales_transactions.findMany({ where: { Tx_ID: { in: batch.map(row => row.Tx_ID) } }, select: { Tx_ID: true, User_ID: true, Merchant_ID: true, District_ID: true, Total_Amount: true, Tx_Timestamp: true } });
    for (const row of existing) {
      const expected = batch.find(item => item.Tx_ID === row.Tx_ID)!;
      assert(row.User_ID === expected.User_ID && row.Merchant_ID === expected.Merchant_ID && row.District_ID === expected.District_ID && Number(row.Total_Amount) === Number(expected.Total_Amount) && row.Tx_Timestamp.getTime() === expected.Tx_Timestamp.getTime(), `Transaction ${row.Tx_ID} belongs to different data; stopping`);
    }
    created += (await prisma.sales_transactions.createMany({ data: batch, skipDuplicates: true })).count;
    if ((Math.floor(index / 400) + 1) % 10 === 0) console.log(`Processed ${Math.min(index + 400, sales.length)} / ${sales.length} sales`);
  }
  console.log(`Ready: ${merchants.length} shops across ${known.length} provinces; created ${created} sales of ${sales.length} expected for campaign week ${bangkokDate(start)}.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
