import type { Prisma } from '../generated/prisma/client';

type StampReader = Pick<Prisma.TransactionClient, 'user_stamps' | 'stamp_redemptions'>;

export async function spendableStamps(db: StampReader, userId: number) {
  const [stamps, redemptions] = await Promise.all([
    db.user_stamps.findMany({
      where: { User_ID: userId, stamp_spend_transactions: { is: null } },
      select: { User_Stamp_ID: true, User_ID: true, Stamp_ID: true, Earn_Source: true, Earned_At: true, Qualifying_Amount: true },
      orderBy: [{ Earned_At: 'asc' }, { User_Stamp_ID: 'asc' }],
    }),
    db.stamp_redemptions.findMany({
      where: { User_ID: userId, Status: { notIn: ['CANCELLED', 'cancelled'] } },
      select: { Stamp_ID: true, Quantity: true, rewards: { select: { Required_Stamp_Count: true, Reward_Type: true } } },
    }),
  ]);
  const reserved = new Map<number, number>();
  for (const redemption of redemptions) {
    if (redemption.rewards.Reward_Type?.toUpperCase() === 'OTOP_PRODUCT') continue;
    reserved.set(redemption.Stamp_ID, (reserved.get(redemption.Stamp_ID) ?? 0) + redemption.Quantity * redemption.rewards.Required_Stamp_Count);
  }
  return stamps.filter(stamp => {
    const count = reserved.get(stamp.Stamp_ID) ?? 0;
    if (count === 0) return true;
    reserved.set(stamp.Stamp_ID, count - 1);
    return false;
  });
}
