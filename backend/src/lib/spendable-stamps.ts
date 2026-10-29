import type { Prisma } from '../generated/prisma/client';

type StampReader = Pick<Prisma.TransactionClient, 'user_stamps' | 'stamp_redemptions'>;

export async function spendableStamps(db: StampReader, userId: number) {
  const [stamps, redemptions] = await Promise.all([
    db.user_stamps.findMany({
      where: { User_ID: userId, stamp_spend_transactions: { is: null } },
      select: {
        User_Stamp_ID: true,
        User_ID: true,
        Stamp_ID: true,
        Earn_Source: true,
        Earned_At: true,
        Qualifying_Amount: true,
        district_stamps: {
          select: {
            District_ID: true,
            districts: { select: { Prov_ID: true } },
          },
        },
      },
      orderBy: [{ Earned_At: 'asc' }, { User_Stamp_ID: 'asc' }],
    }),
    db.stamp_redemptions.findMany({
      where: { User_ID: userId, Status: { notIn: ['CANCELLED', 'cancelled'] } },
      select: {
        Stamp_ID: true,
        Quantity: true,
        rewards: { select: { Required_Stamp_Count: true, Reward_Type: true, Province_ID: true } },
      },
    }),
  ]);
  const available = stamps.map(s => ({ ...s, spent: false }));
  for (const r of redemptions) {
    let needed = (r.Quantity || 1) * (r.rewards?.Required_Stamp_Count || 1);
    const rewardProvId = r.rewards?.Province_ID ?? null;

    // First pass: deduct stamps matching redemption's Stamp_ID
    for (let i = 0; i < available.length && needed > 0; i++) {
      if (!available[i].spent && available[i].Stamp_ID === r.Stamp_ID) {
        available[i].spent = true;
        needed--;
      }
    }

    // Second pass: deduct remaining needed stamps matching province (or any province if reward is nationwide)
    for (let i = 0; i < available.length && needed > 0; i++) {
      if (!available[i].spent) {
        const stampProvId = (available[i] as any).district_stamps?.districts?.Prov_ID ?? null;
        if (!rewardProvId || !stampProvId || stampProvId === rewardProvId) {
          available[i].spent = true;
          needed--;
        }
      }
    }
  }

  return available.filter(s => !s.spent).map(({ spent, ...s }) => s);
}

