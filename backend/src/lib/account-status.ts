import type { Prisma } from '../generated/prisma/client';

export class AccountSuspendedError extends Error {
  readonly code = 'ACCOUNT_SUSPENDED';
  constructor(readonly account: 'SELF' | 'COUNTERPARTY') {
    super(account === 'SELF' ? 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' : 'บัญชีคู่ธุรกรรมถูกระงับการใช้งาน ไม่สามารถชำระเงินหรือบันทึกยอดขายได้');
  }
}

// Lock both accounts in a stable order so suspension cannot commit between the check and payment.
export async function checkPaymentAccounts(tx: Prisma.TransactionClient, buyerId: number, ownerId: number, actorId: number) {
  for (const userId of [...new Set([buyerId, ownerId])].sort((a, b) => a - b)) {
    await tx.$queryRaw`SELECT User_ID FROM users WHERE User_ID = ${userId} FOR UPDATE`;
    const account = await tx.users.findUnique({ where: { User_ID: userId }, select: { Is_Suspended: true } });
    if (!account) throw new Error('ไม่พบบัญชีผู้ใช้งาน');
    if (account.Is_Suspended) throw new AccountSuspendedError(userId === actorId ? 'SELF' : 'COUNTERPARTY');
  }
}
