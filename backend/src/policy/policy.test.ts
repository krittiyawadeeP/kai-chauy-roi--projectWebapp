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
  replace(prisma.grant_policy, 'findFirst', async () => policy);
  replace(prisma.grant_policy, 'findMany', async () => [policy]);
  replace(prisma.grant_policy, 'create', async ({ data }: any) => { policy = { Policy_ID: policy.Policy_ID + 1, ...data }; return policy; });
  replace(prisma.merchants, 'findFirst', async () => ({ Mch_ID: 1, Dist_ID: 99 }));
  replace(prisma.merchants, 'findMany', async () => [
    { Mch_ID: 1, Shop_Name: 'ร้านตัวอย่าง', Category: null, Lat: '13.7563', Lng: '100.5018', districts: { Dist_ID: 99, Dist_Name: 'พระนคร', provinces: { Prov_ID: 1, Prov_Name: 'Bangkok' } } },
    { Mch_ID: 2, Shop_Name: 'ร้านไม่มีพิกัด', Category: null, Lat: null, Lng: null, districts: { Dist_ID: 99, Dist_Name: 'พระนคร', provinces: { Prov_ID: 1, Prov_Name: 'Bangkok' } } },
  ]);
  replace(prisma.users, 'findUnique', async () => ({ User_ID: 10, Role: 'USER' }));
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
    sales_transactions: { create: async ({ data }: any) => ({ Tx_ID: 1n, ...data }) },
    user_grants: { update: async () => { grantUpdates += 1; } },
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const admin = createSession(1, 'ADMIN'); const merchant = createSession(2, 'MERCHANT');
  const government = createSession(3, 'GOVERNMENT'); const citizen = createSession(10, 'USER');
  const request = (path: string, token: string, body?: unknown) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    for (const token of ['', citizen, merchant, government]) {
      assert.equal((await request('/admin/policy', token, { Gov_Pay_Ratio: 0.75, Grant_Amount: 1500, Note: 'ทดสอบ' })).status, token ? 403 : 401);
      for (const path of ['/admin/dashboard', '/admin/dashboard/geography', '/admin/policy', '/admin/policy/history', '/admin/grants']) {
        assert.equal((await request(path, token)).status, token ? 403 : 401, path);
      }
      assert.equal((await request('/admin/grants', token, { Citizen_ID: 'test' })).status, token ? 403 : 401);
    }
    const publicPolicy = await request('/policy', '');
    assert.equal(publicPolicy.status, 200);
    assert.deepEqual(await publicPolicy.json(), { Gov_Pay_Ratio: 0.4, User_Pay_Ratio: 0.6, Grant_Amount: 1000 });
    for (const path of ['/admin/policy', '/admin/policy/history', '/admin/grants']) assert.equal((await request(path, admin)).status, 200, path);
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
    await request('/admin/policy', admin, { Gov_Pay_Ratio: 0.3, Grant_Amount: 1500, Note: 'ปรับนโยบายรอบถัดไป' });
    const second = await (await request('/merchants/me/sales', merchant, { User_ID: 10, Total_Amount: 200, District_ID: 99 })).json() as any;
    assert.equal(second.Gov_Subsidized_Amount, 60);
    assert.equal(second.User_Paid_Amount, 140);
    assert.equal(first.Gov_Subsidized_Amount, 150, 'historical transaction amounts stay unchanged');
  } finally {
    [admin, merchant, government, citizen].forEach(destroySession);
    originals.reverse().forEach(restore => restore());
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
