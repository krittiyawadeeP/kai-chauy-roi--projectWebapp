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

test('provincial reward redemption deducts stamps only from matching province', async () => {
  // User has:
  // User_Stamp_ID 101, 102: Phuket (Prov_ID 83)
  // User_Stamp_ID 201, 202: Chiang Mai (Prov_ID 50)
  const db = {
    user_stamps: {
      findMany: async () => [
        { User_Stamp_ID: BigInt(101), User_ID: 7, Stamp_ID: 8, Earned_At: new Date(1), district_stamps: { District_ID: 8301, districts: { Prov_ID: 83 } } },
        { User_Stamp_ID: BigInt(102), User_ID: 7, Stamp_ID: 9, Earned_At: new Date(2), district_stamps: { District_ID: 8302, districts: { Prov_ID: 83 } } },
        { User_Stamp_ID: BigInt(201), User_ID: 7, Stamp_ID: 2, Earned_At: new Date(3), district_stamps: { District_ID: 5001, districts: { Prov_ID: 50 } } },
        { User_Stamp_ID: BigInt(202), User_ID: 7, Stamp_ID: 2, Earned_At: new Date(4), district_stamps: { District_ID: 5001, districts: { Prov_ID: 50 } } },
      ],
    },
    stamp_redemptions: {
      findMany: async () => [
        // Redeemed Phuket item (requires 2 stamps from Prov_ID 83)
        { Stamp_ID: 8, Quantity: 1, rewards: { Required_Stamp_Count: 2, Reward_Type: 'OTOP_PRODUCT', Province_ID: 83 } },
      ],
    },
  };

  const remaining = await spendableStamps(db as any, 7);
  // Both Phuket stamps (101, 102) should be deducted, while both Chiang Mai stamps (201, 202) MUST be preserved!
  assert.deepEqual(remaining.map(s => Number(s.User_Stamp_ID)), [201, 202]);
});

