import assert from 'node:assert/strict';
import test from 'node:test';
import { spendableStamps } from './spendable-stamps';

test('reward redemptions and cash payments cannot reuse the same stamps', async () => {
  const db = {
    user_stamps: { findMany: async () => [1, 2, 3, 4].map(id => ({ User_Stamp_ID: BigInt(id), User_ID: 7, Stamp_ID: id === 4 ? 2 : 1, Earned_At: new Date(), Qualifying_Amount: null })) },
    stamp_redemptions: { findMany: async () => [{ Stamp_ID: 1, Quantity: 1, rewards: { Required_Stamp_Count: 2, Reward_Type: 'DISCOUNT' } }] },
  };
  assert.deepEqual((await spendableStamps(db as any, 7)).map(stamp => Number(stamp.User_Stamp_ID)), [3, 4]);
});
