import assert from 'node:assert/strict';
import test from 'node:test';
import { remainingDailySubsidy } from './daily-subsidy';

test('daily subsidy uses Bangkok calendar day and completed government payments', async () => {
  const calls: string[] = [];
  let spent = 149.99;
  let stampSpent = 50;
  const tx = {
    $queryRaw: async () => { calls.push('lock'); return [{ User_ID: 7 }]; },
    users: { findUnique: async () => { calls.push('eligibility'); return { Subsidy_Eligible: true }; } },
    sales_transactions: {
      aggregate: async ({ where }: any) => {
        calls.push('sum');
        assert.equal(where.User_ID, 7);
        assert.equal(where.Status, 'COMPLETED');
        assert.equal(where.Tx_Timestamp.gte.toISOString(), '2026-10-27T17:00:00.000Z');
        assert.equal(where.Tx_Timestamp.lt.toISOString(), '2026-10-28T17:00:00.000Z');
        return { _sum: { Gov_Subsidized_Amount: spent, Stamp_Paid_Amount: stampSpent } };
      },
    },
  };
  const now = new Date('2026-10-28T16:59:59.000Z');
  assert.deepEqual(await remainingDailySubsidy(tx as any, 7, now), { remaining: 0.01, timestamp: now });
  assert.deepEqual(calls, ['lock', 'eligibility', 'sum']);
  spent = 250;
  assert.equal((await remainingDailySubsidy(tx as any, 7, now)).remaining, 0);
  spent = 100;
  stampSpent = 0;
  assert.equal((await remainingDailySubsidy(tx as any, 7, now)).remaining, 100);
});

test('ineligible buyers receive zero subsidy under the user lock and can be restored', async () => {
  let locked = false; let eligible = false; let salesReads = 0;
  const tx: any = {
    $queryRaw: async () => { locked = true; return []; },
    users: { findUnique: async () => { assert(locked); return { Subsidy_Eligible: eligible }; } },
    sales_transactions: { aggregate: async () => { salesReads++; return { _sum: { Gov_Subsidized_Amount: 0, Stamp_Paid_Amount: 0 } }; } },
  };
  assert.equal((await remainingDailySubsidy(tx, 7)).remaining, 0);
  assert.equal(salesReads, 0);
  eligible = true;
  assert.equal((await remainingDailySubsidy(tx, 7)).remaining, 200);
});
