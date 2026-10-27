import assert from 'node:assert/strict';
import test from 'node:test';
import { awardPurchaseStamps } from './purchase-stamp';

test('purchase rewards use the district threshold per bill and issue the configured fixed count', async () => {
  const district = { Dist_ID: 7, Dist_Name: 'สามพราน', Stamp_Min_Spend: 200, Stamp_Reward_Count: 2 };
  const stamp = { Stamp_ID: 4, Stamp_Name: 'แสตมป์สามพราน', District_ID: 7 };
  const issued: any[] = [];
  let created = 0;
  let exists = true;
  let locked = false;
  const tx: any = {
    $queryRaw: async (_sql: unknown, id: number) => { assert.equal(id, 7); locked = true; return []; },
    districts: { findUniqueOrThrow: async () => { assert.equal(locked, true); return district; } },
    district_stamps: {
      findFirst: async () => exists ? stamp : null,
      create: async ({ data }: any) => { created++; assert.equal(data.District_ID, 7); return stamp; },
    },
    user_stamps: { create: async ({ data }: any) => { issued.push(data); return data; } },
  };
  const sale = { Tx_ID: 10n, User_ID: 3, Total_Amount: 199.99, Tx_Timestamp: new Date(), District_ID: 7 };
  assert.deepEqual(await awardPurchaseStamps(tx, sale as any), { stamp: null, count: 0 });
  assert.equal(issued.length, 0);
  // Two sub-threshold bills do not accumulate.
  assert.deepEqual(await awardPurchaseStamps(tx, { ...sale, Tx_ID: 11n } as any), { stamp: null, count: 0 });
  assert.equal(issued.length, 0);

  assert.deepEqual(await awardPurchaseStamps(tx, { ...sale, Total_Amount: 200 } as any), { stamp, count: 2 });
  assert.equal(issued.length, 2);
  for (const item of issued) {
    assert.equal(item.User_ID, 3); assert.equal(item.Stamp_ID, 4); assert.equal(item.Earn_Source, 'CO_PAY');
    assert.equal(item.Qualifying_Amount, 200);
    assert.deepEqual(item.stamp_earn_transactions.create, { Tx_ID: 10n, Amount_Used: 200 });
  }
  await awardPurchaseStamps(tx, { ...sale, Tx_ID: 12n, Total_Amount: 600 } as any);
  assert.equal(issued.length, 4, 'larger purchases receive the fixed reward, not multiples');

  district.Stamp_Min_Spend = 150; district.Stamp_Reward_Count = 3; exists = false;
  const result = await awardPurchaseStamps(tx, { ...sale, Tx_ID: 13n, Total_Amount: 150 } as any);
  assert.equal(result.count, 3); assert.equal(created, 1); assert.equal(issued.length, 7);

  tx.user_stamps.create = async () => { throw new Error('write failed'); };
  await assert.rejects(awardPurchaseStamps(tx, { ...sale, Total_Amount: 150 } as any), /write failed/);
});
