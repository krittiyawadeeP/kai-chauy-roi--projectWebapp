import assert from 'node:assert/strict';
import test from 'node:test';
import { remainingDailySubsidy } from './daily-subsidy';

test('daily subsidy uses Bangkok calendar day and completed government payments', async () => {
  const calls: string[] = [];
  let spent = 199.99;
  const tx = {
    $queryRaw: async () => { calls.push('lock'); return [{ User_ID: 7 }]; },
    sales_transactions: {
      aggregate: async ({ where }: any) => {
        calls.push('sum');
        assert.equal(where.User_ID, 7);
        assert.equal(where.Status, 'COMPLETED');
        assert.equal(where.Tx_Timestamp.gte.toISOString(), '2026-10-27T17:00:00.000Z');
        assert.equal(where.Tx_Timestamp.lt.toISOString(), '2026-10-28T17:00:00.000Z');
        return { _sum: { Gov_Subsidized_Amount: spent } };
      },
    },
  };
  const now = new Date('2026-10-28T16:59:59.000Z');
  assert.deepEqual(await remainingDailySubsidy(tx as any, 7, now), { remaining: 0.01, timestamp: now });
  assert.deepEqual(calls, ['lock', 'sum']);
  spent = 250;
  assert.equal((await remainingDailySubsidy(tx as any, 7, now)).remaining, 0);
});
