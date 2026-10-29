import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPaymentAccounts } from './account-status';

test('payment account locks are ordered, deduplicated, and reject a deleted account', async () => {
  const locked: number[] = [];
  let exists = true;
  const tx: any = {
    $queryRaw: async (_sql: unknown, id: number) => { locked.push(id); },
    users: { findUnique: async () => exists ? { Is_Suspended: false } : null },
  };
  await checkPaymentAccounts(tx, 20, 10, 20);
  assert.deepEqual(locked, [10, 20]);
  locked.length = 0;
  await checkPaymentAccounts(tx, 10, 10, 10);
  assert.deepEqual(locked, [10]);
  exists = false;
  await assert.rejects(checkPaymentAccounts(tx, 10, 20, 10), /ไม่พบบัญชี/);
});
