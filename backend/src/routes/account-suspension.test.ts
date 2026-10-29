import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { prisma } from '../lib/prisma';
import { createSession, destroySession } from '../lib/auth';
import { citizenRoutes } from './citizen.routes';
import { merchantRoutes } from './merchant.routes';

test('both payment routes reject suspended counterparties and recheck the caller inside the transaction before any writes', async () => {
  const originals = { user: prisma.users.findUnique, merchant: prisma.merchants.findFirst, grant: prisma.user_grants.findFirst, policy: prisma.grant_policy.findFirst, transaction: prisma.$transaction };
  const shop = { Mch_ID: 3, User_ID: 20, Dist_ID: 99 };
  const accounts = new Map([[10, { Is_Suspended: false }], [20, { Is_Suspended: false }]]);
  const locked: number[] = [];
  let suspendedId = 20;
  let writes = 0;
  (prisma.users as any).findUnique = async ({ where }: any) => accounts.get(where.User_ID);
  (prisma.merchants as any).findFirst = async () => shop;
  (prisma.user_grants as any).findFirst = async () => null;
  (prisma.grant_policy as any).findFirst = async () => null;
  (prisma as any).$transaction = async (run: (tx: any) => Promise<unknown>) => {
    // Suspension may commit after authentication but before payment begins.
    accounts.get(suspendedId)!.Is_Suspended = true;
    return run({
      $queryRaw: async (_sql: unknown, id: number) => { locked.push(id); return [{ User_ID: id }]; },
      users: { findUnique: async ({ where }: any) => { assert(locked.includes(where.User_ID)); return accounts.get(where.User_ID); } },
      merchants: { findUnique: async () => shop },
      wallets: { updateMany: async () => { writes++; throw new Error('must not debit'); }, upsert: async () => { writes++; } },
      user_grants: { create: async () => { writes++; }, updateMany: async () => { writes++; } },
      sales_transactions: { create: async () => { writes++; } },
    });
  };
  const app = express(); app.use(express.json()); app.use('/merchants', merchantRoutes); app.use(citizenRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const buyer = createSession(10, 'USER'); const owner = createSession(20, 'MERCHANT');
  try {
    for (const merchantSale of [false, true]) for (const self of [false, true]) {
      for (const account of accounts.values()) account.Is_Suspended = false;
      locked.length = 0;
      const actorId = merchantSale ? 20 : 10;
      suspendedId = self ? actorId : merchantSale ? 10 : 20;
      const response = await fetch(base + (merchantSale ? '/merchants/me/sales' : '/user/pay'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantSale ? owner : buyer}` },
        body: JSON.stringify({ User_ID: 10, Merchant_ID: 3, District_ID: 99, Total_Amount: 100 }),
      });
      assert.equal(response.status, 403);
      const error = await response.json() as any;
      assert.equal(error.code, 'ACCOUNT_SUSPENDED');
      assert.equal(error.account, self ? 'SELF' : 'COUNTERPARTY');
      assert.deepEqual(locked, suspendedId === 10 ? [10] : [10, 20]);
      assert.equal(writes, 0, 'wallets, grants and transactions must remain untouched');
    }
    accounts.get(20)!.Is_Suspended = true;
    const denied = await fetch(base + '/merchants/me/wallet', { headers: { Authorization: `Bearer ${owner}` } });
    assert.equal(denied.status, 403);
  } finally {
    destroySession(buyer); destroySession(owner);
    (prisma.users as any).findUnique = originals.user;
    (prisma.merchants as any).findFirst = originals.merchant;
    (prisma.user_grants as any).findFirst = originals.grant;
    (prisma.grant_policy as any).findFirst = originals.policy;
    (prisma as any).$transaction = originals.transaction;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
