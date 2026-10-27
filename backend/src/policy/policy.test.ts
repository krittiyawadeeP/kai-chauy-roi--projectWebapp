import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { apiRouter } from '../routes';
import { validatePolicy } from './policy';

test('global policy requires complete valid ratios, money and audit reason', () => {
  assert.equal(validatePolicy({ Gov_Pay_Ratio: 0.6, Grant_Amount: 1000, Note: 'อ้างอิงคำสั่งโครงการ' }), null);
  for (const ratio of [0, 1, -0.1, NaN, '0.4x', 0.12345]) assert.ok(validatePolicy({ Gov_Pay_Ratio: ratio, Grant_Amount: 1000, Note: 'เหตุผล' }));
  for (const amount of [0, -1, NaN, 1.001, '1000', undefined]) assert.ok(validatePolicy({ Gov_Pay_Ratio: 0.4, Grant_Amount: amount, Note: 'เหตุผล' }));
  assert.ok(validatePolicy({ Gov_Pay_Ratio: 0.4, Grant_Amount: 1000, Note: ' ' }));
});

test('feature routes keep their URLs and admin guards; merchant sales use the global policy', async () => {
  const app = express(); app.use(express.json()); app.use(apiRouter);
  const originals: (() => void)[] = [];
  const replace = (target: any, key: string, value: unknown) => { const original = target[key]; target[key] = value; originals.push(() => { target[key] = original; }); };
  let policy: any = { Policy_ID: 1, Gov_Pay_Ratio: 0.4, User_Pay_Ratio: 0.6, Grant_Amount: 1000 };
  let grantUpdates = 0;
  let grantDebits = 0;
  let walletDebits = 0;
  let merchantCredits = 0;
  let allowPayment = true;
  let dailySubsidySpent = 0;
  let issuedPurchaseStamps = 0;
  const spentStampIds = new Set<bigint>();
  const rewardRedemptions: any[] = [];
  let rewardRequired = 5;
  replace(prisma.grant_policy, 'findFirst', async () => policy);
  replace(prisma.grant_policy, 'findMany', async () => [policy]);
  replace(prisma.grant_policy, 'create', async ({ data }: any) => { policy = { Policy_ID: policy.Policy_ID + 1, ...data }; return policy; });
  replace(prisma.merchants, 'findFirst', async () => ({ Mch_ID: 1, Dist_ID: 99 }));
  replace(prisma.merchants, 'findMany', async () => [
    { Mch_ID: 1, Shop_Name: 'ร้านตัวอย่าง', Category: null, Lat: '13.7563', Lng: '100.5018', districts: { Dist_ID: 99, Dist_Name: 'พระนคร', provinces: { Prov_ID: 1, Prov_Name: 'Bangkok' } } },
    { Mch_ID: 2, Shop_Name: 'ร้านไม่มีพิกัด', Category: null, Lat: null, Lng: null, districts: { Dist_ID: 99, Dist_Name: 'พระนคร', provinces: { Prov_ID: 1, Prov_Name: 'Bangkok' } } },
  ]);
  replace(prisma.users, 'findUnique', async () => ({ User_ID: 10, Role: 'USER' }));
  replace(prisma.rewards, 'findUnique', async () => ({ Reward_ID: 1, Status: 'ACTIVE', Reward_Type: 'DISCOUNT', Required_Stamp_Count: rewardRequired }));
  replace(prisma.user_grants, 'findFirst', async () => ({ Grant_ID: 1n, Remaining_Amount: 1000 }));
  replace(prisma.user_grants, 'findMany', async () => [{ Status: 'ACTIVE' }]);
  replace(prisma.user_grants, 'create', async ({ data }: any) => ({ Grant_ID: 1n, ...data }));
  replace(prisma.user_grants, 'aggregate', async () => ({ _sum: { Total_Grant_Amount: 1000, Remaining_Amount: 920 }, _count: { Grant_ID: 1 } }));
  replace(prisma.user_grants, 'groupBy', async () => []);
  replace(prisma.sales_transactions, 'aggregate', async () => ({ _sum: { Total_Amount: 200, Gov_Subsidized_Amount: 80, User_Paid_Amount: 120 }, _count: { Tx_ID: 2 } }));
  replace(prisma.sales_transactions, 'groupBy', async () => []);
  replace(prisma.provinces, 'findMany', async () => [{ Prov_ID: 1, Prov_Name: 'Bangkok', districts: [{ Dist_ID: 99, Dist_Name: 'พระนคร', _count: { merchants: 2 } }] }]);
  replace(prisma.users, 'findMany', async () => []);
  replace(prisma, '$transaction', async (callback: any) => callback({
    $queryRaw: async () => [{ User_ID: 10 }],
    sales_transactions: {
      aggregate: async () => ({ _sum: { Gov_Subsidized_Amount: dailySubsidySpent, Stamp_Paid_Amount: 0 } }),
      create: async ({ data }: any) => { dailySubsidySpent += data.Gov_Subsidized_Amount + (data.Stamp_Paid_Amount ?? 0); return { Tx_ID: 1n, ...data }; },
    },
    user_grants: {
      findFirst: async () => ({ Grant_ID: 1n, User_ID: 10, Total_Grant_Amount: 1000, Remaining_Amount: 1000 }),
      findUniqueOrThrow: async () => ({ Grant_ID: 1n, User_ID: 10, Total_Grant_Amount: 1000, Remaining_Amount: 1000 }),
      update: async () => ({ Grant_ID: 1n, User_ID: 10, Total_Grant_Amount: 1000, Remaining_Amount: 1000 }),
      updateMany: async ({ data }: any) => { grantUpdates += 1; grantDebits += data.Remaining_Amount.decrement; return { count: 1 }; },
    },
    wallets: {
      findFirst: async () => ({ Wallet_ID: 1, User_ID: 10, Balance: 1000 }),
      findUniqueOrThrow: async () => ({ Wallet_ID: 1, User_ID: 10, Balance: 1000, Updated_At: new Date() }),
      updateMany: async ({ data }: any) => { if (!allowPayment) return { count: 0 }; walletDebits += data.Balance.decrement; return { count: 1 }; },
      update: async ({ data }: any) => ({ Wallet_ID: 1, User_ID: 10, Balance: 1000 - data.Balance.decrement, Updated_At: new Date() }),
      upsert: async ({ update }: any) => { merchantCredits += update.Balance.increment; },
    },
    merchants: { findUnique: async () => ({ Mch_ID: 1, Dist_ID: 99 }) },
    user_stamps: {
      findMany: async () => Array.from({ length: 25 }, (_, index) => ({ User_Stamp_ID: BigInt(index + 1), Stamp_ID: 1, User_ID: 10, Earned_At: new Date(), Qualifying_Amount: null })).filter(stamp => !spentStampIds.has(stamp.User_Stamp_ID)),
      create: async ({ data }: any) => { issuedPurchaseStamps++; assert.equal(data.stamp_earn_transactions.create.Tx_ID, 1n); return data; },
    },
    stamp_redemptions: {
      findMany: async () => rewardRedemptions.map(redemption => ({ Stamp_ID: redemption.Stamp_ID, Quantity: redemption.Quantity, rewards: { Required_Stamp_Count: redemption.Required_Stamp_Count, Reward_Type: 'DISCOUNT' } })),
      create: async ({ data }: any) => { rewardRedemptions.push({ ...data, Required_Stamp_Count: rewardRequired }); return data; },
    },
    stamp_spend_transactions: { createMany: async ({ data }: any) => { for (const stamp of data) spentStampIds.add(stamp.User_Stamp_ID); } },
    missions: { findFirst: async () => null },
    districts: { findUniqueOrThrow: async () => ({ Dist_ID: 99, Dist_Name: 'พระนคร', Stamp_Min_Spend: 150, Stamp_Reward_Count: 2 }) },
    district_stamps: { findFirst: async () => ({ Stamp_ID: 1, Stamp_Name: 'แสตมป์พระนคร', District_ID: 99 }) },
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const admin = createSession(1, 'ADMIN'); const merchant = createSession(2, 'MERCHANT');
  const government = createSession(3, 'GOVERNMENT'); const citizen = createSession(10, 'USER');
  const request = (path: string, token: string, body?: unknown) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    assert.equal((await fetch(base + '/merchants/1', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Lat: 13 }) })).status, 404);
    assert.equal((await fetch(base + '/merchants/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Lat: 13 }) })).status, 401);
    for (const token of ['', citizen, merchant, government]) {
      assert.equal((await request('/admin/policy', token, { Gov_Pay_Ratio: 0.75, Grant_Amount: 1500, Note: 'ทดสอบ' })).status, token ? 403 : 401);
      for (const path of ['/admin/dashboard', '/admin/dashboard/geography', '/admin/policy', '/admin/policy/history', '/admin/grants']) {
        assert.equal((await request(path, token)).status, token ? 403 : 401, path);
      }
      assert.equal((await request('/admin/grants', token, { Citizen_ID: 'test' })).status, token ? 403 : 401);
      assert.equal((await request('/admin/provinces/73/daily-mission-suggestion', token, {})).status, token ? 403 : 401);
    }
    const publicPolicy = await request('/policy', '');
    assert.equal(publicPolicy.status, 200);
    assert.deepEqual(await publicPolicy.json(), { Gov_Pay_Ratio: 0.4, User_Pay_Ratio: 0.6, Grant_Amount: 1000 });
    for (const path of ['/admin/policy', '/admin/policy/history', '/admin/grants']) assert.equal((await request(path, admin)).status, 200, path);
    assert.equal((await request('/admin/provinces/invalid/daily-mission-suggestion', admin, {})).status, 400);
    const dashboard = await request('/admin/dashboard', admin);
    assert.equal(dashboard.status, 200);
    assert.equal((await dashboard.json() as any).transactions.totalRevenue, 200);
    const geography = await request('/admin/dashboard/geography', admin);
    assert.equal(geography.status, 200);
    const geographicData = await geography.json() as any;
    assert.equal(geographicData.provinces.length, 77);
    assert.equal(geographicData.provinces.find((p: any) => p.code === '10').merchantCount, 2);
    assert.equal(geographicData.merchants.length, 1);
    assert.equal(geographicData.merchants[0].lat, 13.7563);
    assert.equal(geographicData.merchants[0].provinceCode, '10');
    assert.equal(geographicData.merchants[0].districtCode, '1001');
    assert.equal(geographicData.districts.find((d: any) => d.code === '1001').merchantCount, 2);
    assert.equal((await request('/admin/grants', admin, {})).status, 400);
    const grant = await request('/admin/grants', admin, { Citizen_ID: 'test', Total_Grant_Amount: 999 });
    assert.equal(grant.status, 201);
    assert.equal((await grant.json() as any).Total_Grant_Amount, 1000);
    assert.equal((await request('/admin/policy', admin, { Gov_Pay_Ratio: '0.6xyz', Grant_Amount: 1500, Note: 'ทดสอบ' })).status, 400);
    const saved = await request('/admin/policy', admin, { Gov_Pay_Ratio: 0.75, Grant_Amount: 1500, Note: 'อ้างอิงคำสั่งใหม่' });
    assert.equal(saved.status, 201);
    assert.equal(policy.User_Pay_Ratio, 0.25);
    assert.equal(policy.Created_By, 1);
    assert.equal(grantUpdates, 0, 'changing policy must not reset existing grant balances');
    const sale = await request('/merchants/me/sales', merchant, { User_ID: 10, Total_Amount: 200, District_ID: 99 });
    assert.equal(sale.status, 201);
    const first = await sale.json() as any;
    assert.equal(first.Gov_Subsidized_Amount, 150);
    assert.equal(first.User_Paid_Amount, 50);
    assert.equal(first.awardedStampCount, 2);
    assert.equal(issuedPurchaseStamps, 2);
    assert.equal(walletDebits, 50);
    assert.equal(merchantCredits, 200);
    await request('/admin/policy', admin, { Gov_Pay_Ratio: 0.3, Grant_Amount: 1500, Note: 'ปรับนโยบายรอบถัดไป' });
    const second = await (await request('/merchants/me/sales', merchant, { User_ID: 10, Total_Amount: 200, District_ID: 99 })).json() as any;
    assert.equal(second.Gov_Subsidized_Amount, 50);
    assert.equal(second.User_Paid_Amount, 150);
    assert.equal(walletDebits, 200);
    assert.equal(merchantCredits, 400);
    const citizenPayment = await request('/user/pay', citizen, { Merchant_ID: 1, Total_Amount: 100, District_ID: 99 });
    assert.equal(citizenPayment.status, 200);
    const citizenResult = await citizenPayment.json() as any;
    assert.equal(citizenResult.transaction.govSubsidizedAmount, 0);
    assert.equal(citizenResult.transaction.userPaidAmount, 100);
    assert.equal(citizenResult.awardedStampCount, 0);
    assert.equal(issuedPurchaseStamps, 4, 'a sub-threshold citizen payment does not issue stamps');
    assert.equal(merchantCredits, 500, 'citizen payment must credit the merchant wallet');
    dailySubsidySpent = 0;
    policy = { ...policy, Gov_Pay_Ratio: 0.6, User_Pay_Ratio: 0.4 };
    const stampPayment = await request('/user/pay', citizen, { Merchant_ID: 1, Total_Amount: 100, District_ID: 99, Stamp_Count: 20 });
    assert.equal(stampPayment.status, 200);
    const stampResult = await stampPayment.json() as any;
    assert.equal(stampResult.transaction.govSubsidizedAmount, 60);
    assert.equal(stampResult.transaction.stampPaidAmount, 20);
    assert.equal(stampResult.transaction.userPaidAmount, 20);
    assert.equal(walletDebits, 320, 'only the remaining citizen share is debited from the wallet');
    assert.equal(grantDebits, 280, 'government balance pays both the normal subsidy and redeemed stamps');
    assert.equal(spentStampIds.size, 20);
    assert.equal(merchantCredits, 600, 'merchant receives the full sale including government-funded stamps');
    assert.equal((await request('/user/pay', citizen, { Merchant_ID: 1, Total_Amount: 100, District_ID: 99, Stamp_Count: 21 })).status, 400);
    assert.equal((await request('/user/pay', citizen, { Merchant_ID: 1, Total_Amount: 100, District_ID: 99, Stamp_Count: 6 })).status, 400);
    rewardRequired = 5;
    assert.equal((await request('/stamp-redemptions', citizen, { Reward_ID: 1, Stamp_ID: 1, Quantity: 1 })).status, 201);
    assert.equal((await request('/user/pay', citizen, { Merchant_ID: 1, Total_Amount: 100, District_ID: 99, Stamp_Count: 1 })).status, 400, 'reward stamps cannot also pay for a sale');
    dailySubsidySpent = 190;
    assert.equal((await request('/user/pay', citizen, { Merchant_ID: 1, Total_Amount: 100, District_ID: 99, Stamp_Count: 1 })).status, 400);
    assert.equal(merchantCredits, 600, 'rejected stamp payments do not credit the merchant');
    allowPayment = false;
    assert.equal((await request('/merchants/me/sales', merchant, { User_ID: 10, Total_Amount: 200, District_ID: 99 })).status, 400);
    assert.equal(merchantCredits, 600, 'failed payment must not credit the merchant');
    assert.equal(first.Gov_Subsidized_Amount, 150, 'historical transaction amounts stay unchanged');
    allowPayment = true; dailySubsidySpent = 0;
    const qualifying = await request('/user/pay', citizen, { Merchant_ID: 1, Total_Amount: 150, District_ID: 99 });
    assert.equal(qualifying.status, 200);
    assert.equal((await qualifying.json() as any).awardedStampCount, 2);
    assert.equal(issuedPurchaseStamps, 6);
  } finally {
    [admin, merchant, government, citizen].forEach(destroySession);
    originals.reverse().forEach(restore => restore());
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
