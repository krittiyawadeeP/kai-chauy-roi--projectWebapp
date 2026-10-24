import type { Prisma } from '../generated/prisma/client';

type CompletedSale = { Tx_ID: bigint; User_ID: number; Merchant_ID: number; Total_Amount: Prisma.Decimal; Tx_Timestamp: Date; Status: string };

export async function awardMissionStamp(tx: Prisma.TransactionClient, missionId: number, sale: CompletedSale) {
  await tx.$queryRaw`SELECT Mission_ID FROM missions WHERE Mission_ID = ${missionId} FOR UPDATE`;
  const mission = await tx.missions.findUnique({
    where: { Mission_ID: missionId },
    select: { Target_Merchant_ID: true, Start_DateTime: true, End_DateTime: true, Max_Recipients: true, Status: true, merchants: { select: { Dist_ID: true } } },
  });
  if (!mission || !['ACTIVE', 'active', 'OPEN', 'open'].includes(mission.Status) ||
      mission.Target_Merchant_ID !== sale.Merchant_ID || !['COMPLETED', 'completed'].includes(sale.Status) ||
      sale.Tx_Timestamp < mission.Start_DateTime || sale.Tx_Timestamp > mission.End_DateTime) return null;

  const existing = await tx.user_stamps.findFirst({ where: { User_ID: sale.User_ID, Mission_ID: missionId } });
  if (existing) return { stamp: existing, created: false };
  if (await tx.user_stamps.count({ where: { Mission_ID: missionId } }) >= mission.Max_Recipients) return null;

  const districtId = mission.merchants.Dist_ID;
  await tx.$queryRaw`SELECT Dist_ID FROM districts WHERE Dist_ID = ${districtId} FOR UPDATE`;
  let districtStamp = await tx.district_stamps.findFirst({ where: { District_ID: districtId }, orderBy: { Stamp_ID: 'asc' } });
  if (!districtStamp) {
    const district = await tx.districts.findUniqueOrThrow({ where: { Dist_ID: districtId } });
    districtStamp = await tx.district_stamps.create({ data: { District_ID: districtId, Stamp_Name: `แสตมป์${district.Dist_Name}` } });
  }

  const stamp = await tx.user_stamps.create({
    data: {
      User_ID: sale.User_ID, Stamp_ID: districtStamp.Stamp_ID, Mission_ID: missionId,
      Earn_Source: 'MISSION', Qualifying_Amount: sale.Total_Amount, Earned_At: sale.Tx_Timestamp,
      stamp_earn_transactions: { create: { Tx_ID: sale.Tx_ID, Amount_Used: sale.Total_Amount } },
    },
    include: { district_stamps: { include: { districts: true } }, missions: true },
  });
  return { stamp, created: true };
}
