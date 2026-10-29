import type { Prisma } from "../generated/prisma/client";
import { bangkokDate } from "./sales-mission";

export const DAILY_SUBSIDY_LIMIT = 200;

// Lock the citizen before reading today's sales so concurrent payments see each other's committed totals.
export async function remainingDailySubsidy(tx: Prisma.TransactionClient, userId: number, at?: Date) {
  await tx.$queryRaw`SELECT User_ID FROM users WHERE User_ID = ${userId} FOR UPDATE`;
  const account = await tx.users.findUnique({ where: { User_ID: userId }, select: { Subsidy_Eligible: true } });
  if (!account) throw new Error('ไม่พบบัญชีผู้ใช้งาน');
  const now = at ?? new Date();
  if (!account.Subsidy_Eligible) return { remaining: 0, timestamp: now };
  const start = new Date(`${bangkokDate(now)}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const spent = await tx.sales_transactions.aggregate({
    where: { User_ID: userId, Status: "COMPLETED", Tx_Timestamp: { gte: start, lt: end } },
    _sum: { Gov_Subsidized_Amount: true, Stamp_Paid_Amount: true },
  });
  const spentCents = Math.round(Number(spent._sum.Gov_Subsidized_Amount ?? 0) * 100) + Math.round(Number(spent._sum.Stamp_Paid_Amount ?? 0) * 100);
  return { remaining: Math.max(0, DAILY_SUBSIDY_LIMIT * 100 - spentCents) / 100, timestamp: now };
}
