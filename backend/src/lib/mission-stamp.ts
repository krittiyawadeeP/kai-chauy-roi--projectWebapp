import type { Prisma } from '../generated/prisma/client';
import { bangkokDate } from './sales-mission';

type CompletedSale = { Tx_ID: bigint; User_ID: number; Merchant_ID: number; Total_Amount: Prisma.Decimal; Tx_Timestamp: Date; Status: string };

export async function awardMissionStamp(tx: Prisma.TransactionClient, missionId: number, sale: CompletedSale) {
  await tx.$queryRaw`SELECT Mission_ID FROM missions WHERE Mission_ID = ${missionId} FOR UPDATE`;
  const mission = await tx.missions.findUnique({
    where: { Mission_ID: missionId },
    select: { Target_Merchant_ID: true, Start_DateTime: true, End_DateTime: true, Campaign_Week_Start: true, Daily_Start_Minute: true, Daily_End_Minute: true, Ai_Daily_Stamp_Limit: true, Max_Recipients: true, Status: true, merchants: { select: { Dist_ID: true } } },
  });
  const isAi = Boolean(mission?.Campaign_Week_Start);
  if (!mission || !['ACTIVE', 'active', 'OPEN', 'open'].includes(mission.Status) ||
      mission.Target_Merchant_ID !== sale.Merchant_ID || !['COMPLETED', 'completed'].includes(sale.Status) ||
      sale.Tx_Timestamp < mission.Start_DateTime || (isAi ? sale.Tx_Timestamp >= mission.End_DateTime : sale.Tx_Timestamp > mission.End_DateTime)) return null;

  let aiDate: Date | null = null;
  if (isAi) {
    const localMinute = ((sale.Tx_Timestamp.getUTCHours() + 7) % 24) * 60 + sale.Tx_Timestamp.getUTCMinutes();
    if (mission.Daily_Start_Minute === null || mission.Daily_End_Minute === null ||
        localMinute < mission.Daily_Start_Minute || localMinute >= mission.Daily_End_Minute) return null;
    aiDate = new Date(`${bangkokDate(sale.Tx_Timestamp)}T00:00:00.000Z`);
    await tx.$queryRaw`SELECT User_ID FROM users WHERE User_ID = ${sale.User_ID} FOR UPDATE`;
    const alreadyLinked = await tx.user_stamps.findFirst({ where: { User_ID: sale.User_ID, Earn_Source: 'AI_MISSION', stamp_earn_transactions: { some: { Tx_ID: sale.Tx_ID } } } });
    if (alreadyLinked) return { stamp: alreadyLinked, created: false };
    const policy = await tx.ai_mission_policy.findFirst({ where: { Effective_From: { lte: sale.Tx_Timestamp } }, orderBy: [{ Effective_From: 'desc' }, { Policy_ID: 'desc' }] });
    const issuedToday = await tx.user_stamps.count({ where: { User_ID: sale.User_ID, Earn_Source: 'AI_MISSION', Ai_Mission_Date: aiDate } });
    if (issuedToday >= (mission.Ai_Daily_Stamp_Limit ?? policy?.Daily_Stamp_Limit ?? 1)) return null;
  } else {
    const existing = await tx.user_stamps.findFirst({ where: { User_ID: sale.User_ID, Mission_ID: missionId } });
    if (existing) return { stamp: existing, created: false };
    if (mission.Max_Recipients !== null && await tx.user_stamps.count({ where: { Mission_ID: missionId } }) >= mission.Max_Recipients) return null;
  }

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
      Earn_Source: isAi ? 'AI_MISSION' : 'MISSION', Ai_Mission_Date: aiDate, Qualifying_Amount: sale.Total_Amount, Earned_At: sale.Tx_Timestamp,
      stamp_earn_transactions: { create: { Tx_ID: sale.Tx_ID, Amount_Used: sale.Total_Amount } },
    },
    include: { district_stamps: { include: { districts: true } }, missions: true },
  });
  return { stamp, created: true };
}
