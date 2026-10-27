import type { Prisma } from '../generated/prisma/client';

type Purchase = { Tx_ID: bigint; User_ID: number; Total_Amount: Prisma.Decimal; Tx_Timestamp: Date; District_ID: number };

export async function awardPurchaseStamps(tx: Prisma.TransactionClient, sale: Purchase) {
  await tx.$queryRaw`SELECT Dist_ID FROM districts WHERE Dist_ID = ${sale.District_ID} FOR UPDATE`;
  const district = await tx.districts.findUniqueOrThrow({ where: { Dist_ID: sale.District_ID } });
  if (Number(sale.Total_Amount) < Number(district.Stamp_Min_Spend)) return { stamp: null, count: 0 };

  let stamp = await tx.district_stamps.findFirst({ where: { District_ID: sale.District_ID }, orderBy: { Stamp_ID: 'asc' } });
  if (!stamp) stamp = await tx.district_stamps.create({ data: { District_ID: sale.District_ID, Stamp_Name: `แสตมป์${district.Dist_Name}` } });
  for (let index = 0; index < district.Stamp_Reward_Count; index++) {
    await tx.user_stamps.create({
      data: {
        User_ID: sale.User_ID, Stamp_ID: stamp.Stamp_ID, Earn_Source: 'CO_PAY',
        Qualifying_Amount: sale.Total_Amount, Earned_At: sale.Tx_Timestamp,
        // Each stamp references the qualifying bill; Amount_Used is evidence, not a debit.
        stamp_earn_transactions: { create: { Tx_ID: sale.Tx_ID, Amount_Used: sale.Total_Amount } },
      },
    });
  }
  return { stamp, count: district.Stamp_Reward_Count };
}
