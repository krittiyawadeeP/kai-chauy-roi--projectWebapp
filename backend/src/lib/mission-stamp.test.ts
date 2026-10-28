import assert from 'node:assert/strict';
import test from 'node:test';

import { awardMissionStamp } from './mission-stamp';

test('mission sale awards one stamp from the merchant district and cannot award twice', async () => {
  const now = new Date('2026-10-24T08:00:00Z');
  const sale = { Tx_ID: 42n, User_ID: 7, Merchant_ID: 3, Total_Amount: 180, Tx_Timestamp: now, Status: 'COMPLETED' };
  let stored: any = null;
  let issued = 0;
  let stampedDistrict: number | null = null;
  let linkedSale: bigint | null = null;
  const tx: any = {
    $queryRaw: async () => [{ Mission_ID: 2 }],
    missions: { findUnique: async () => ({ Target_Merchant_ID: 3, Start_DateTime: new Date('2026-10-24T07:00:00Z'), End_DateTime: new Date('2026-10-24T09:00:00Z'), Max_Recipients: 50, Status: 'ACTIVE', merchants: { Dist_ID: 1206 } }) },
    user_stamps: {
      findFirst: async () => stored,
      count: async () => issued,
      create: async ({ data }: any) => { stored = data; issued++; linkedSale = data.stamp_earn_transactions.create.Tx_ID; return data; },
    },
    district_stamps: {
      findFirst: async ({ where }: any) => { stampedDistrict = where.District_ID; return { Stamp_ID: 9 }; },
    },
  };

  const first = await awardMissionStamp(tx, 2, sale as any);
  const second = await awardMissionStamp(tx, 2, sale as any);
  assert.equal(first?.created, true);
  assert.equal(second?.created, false);
  assert.equal(issued, 1);
  assert.equal(stampedDistrict, 1206);
  assert.equal(stored.Stamp_ID, 9);
  assert.equal(stored.User_ID, 7);
  assert.equal(linkedSale, 42n);
});

test('mission rejects purchases outside its time window', async () => {
  const tx: any = {
    $queryRaw: async () => [],
    missions: { findUnique: async () => ({ Target_Merchant_ID: 3, Start_DateTime: new Date('2026-10-25T07:00:00Z'), End_DateTime: new Date('2026-10-25T09:00:00Z'), Max_Recipients: 50, Status: 'ACTIVE', merchants: { Dist_ID: 1206 } }) },
  };
  const result = await awardMissionStamp(tx, 2, { Tx_ID: 42n, User_ID: 7, Merchant_ID: 3, Total_Amount: 180, Tx_Timestamp: new Date('2026-10-24T08:00:00Z'), Status: 'COMPLETED' } as any);
  assert.equal(result, null);
});

test('mission does not issue a fifty-first stamp', async () => {
  const tx: any = {
    $queryRaw: async () => [],
    missions: { findUnique: async () => ({ Target_Merchant_ID: 3, Start_DateTime: new Date('2026-10-24T07:00:00Z'), End_DateTime: new Date('2026-10-24T09:00:00Z'), Max_Recipients: 50, Status: 'ACTIVE', merchants: { Dist_ID: 1206 } }) },
    user_stamps: { findFirst: async () => null, count: async () => 50 },
  };
  const result = await awardMissionStamp(tx, 2, { Tx_ID: 42n, User_ID: 7, Merchant_ID: 3, Total_Amount: 180, Tx_Timestamp: new Date('2026-10-24T08:00:00Z'), Status: 'COMPLETED' } as any);
  assert.equal(result, null);
});

test('AI mission issues district stamps during its daily window up to the government daily limit', async () => {
  const issued: any[] = [];
  const tx: any = {
    $queryRaw: async () => [],
    missions: { findUnique: async () => ({ Target_Merchant_ID: 3, Start_DateTime: new Date('2026-10-25T17:00:00Z'), End_DateTime: new Date('2026-11-01T17:00:00Z'), Campaign_Week_Start: new Date('2026-10-26T00:00:00Z'), Daily_Start_Minute: 12 * 60, Daily_End_Minute: 14 * 60, Max_Recipients: null, Status: 'ACTIVE', merchants: { Dist_ID: 1206 } }) },
    ai_mission_policy: { findFirst: async () => ({ Daily_Stamp_Limit: 2 }) },
    user_stamps: {
      findFirst: async ({ where }: any) => issued.find(item => item.User_ID === where.User_ID && item.stamp_earn_transactions.create.Tx_ID === where.stamp_earn_transactions.some.Tx_ID) ?? null,
      count: async ({ where }: any) => issued.filter(item => item.User_ID === where.User_ID && item.Earn_Source === where.Earn_Source && item.Ai_Mission_Date.getTime() === where.Ai_Mission_Date.getTime()).length,
      create: async ({ data }: any) => { issued.push(data); return data; },
    },
    district_stamps: { findFirst: async () => ({ Stamp_ID: 9 }) },
  };
  const buy = (id: bigint, iso: string) => awardMissionStamp(tx, 5, { Tx_ID: id, User_ID: 7, Merchant_ID: 3, Total_Amount: 1, Tx_Timestamp: new Date(iso), Status: 'COMPLETED' } as any);
  assert.equal((await buy(1n, '2026-10-26T05:00:00Z'))?.created, true);
  assert.equal((await buy(2n, '2026-10-26T06:59:59Z'))?.created, true);
  assert.equal(await buy(3n, '2026-10-26T05:30:00Z'), null);
  assert.equal(await buy(4n, '2026-10-26T07:00:00Z'), null);
  assert.equal((await buy(5n, '2026-10-27T05:00:00Z'))?.created, true);
  assert.equal(issued.length, 3);
  assert.ok(issued.every(item => item.Stamp_ID === 9 && item.Earn_Source === 'AI_MISSION'));
});
