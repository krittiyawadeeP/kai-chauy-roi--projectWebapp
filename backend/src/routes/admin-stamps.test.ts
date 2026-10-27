import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { adminRoutes } from './admin.routes';
import { citizenRoutes } from './citizen.routes';

test('admin overview includes every district and aggregates issued stamps while edits preserve ownership', async () => {
  const record = {
    Stamp_ID: 1, Stamp_Name: 'แสตมป์สามพราน', District_ID: 7,
    districts: { Dist_ID: 7, Dist_Name: 'สามพราน', Prov_ID: 1, Stamp_Min_Spend: 150, Stamp_Reward_Count: 1, provinces: { Prov_Name: 'นครปฐม' } },
    _count: { user_stamps: 12 },
  };
  let writes = 0;
  const originals = {
    list: prisma.districts.findMany, find: prisma.district_stamps.findUnique,
    create: prisma.district_stamps.create, update: prisma.district_stamps.update,
    district: prisma.districts.findUnique,
    districtUpdate: prisma.districts.update,
  };
  (prisma.districts as any).findMany = async () => [
    { ...record.districts, district_stamps: [record, { Stamp_Name: 'ชื่อเดิม', _count: { user_stamps: 3 } }] },
    { Dist_ID: 8, Dist_Name: 'นครชัยศรี', Prov_ID: 1, Stamp_Min_Spend: 150, Stamp_Reward_Count: 1, provinces: { Prov_Name: 'นครปฐม' }, district_stamps: [] },
  ];
  (prisma.district_stamps as any).findUnique = async ({ where }: any) => where.Stamp_ID === 1 ? record : null;
  (prisma.districts as any).findUnique = async ({ where }: any) => where.Dist_ID === 7 ? { ...record.districts, district_stamps: [record] } : null;
  (prisma.districts as any).update = async ({ data }: any) => { writes++; Object.assign(record.districts, data); return record.districts; };
  (prisma.district_stamps as any).create = async ({ data }: any) => { writes++; return { ...record, ...data, Stamp_ID: 2 }; };
  (prisma.district_stamps as any).update = async ({ data }: any) => { writes++; return { ...record, ...data }; };
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  app.use('/public', citizenRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const token = createSession(1, 'ADMIN');
  const citizen = createSession(2, 'USER');
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/admin/stamps`;
  const write = (method: string, body: unknown, path = '') => fetch(url + path, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${citizen}` } })).status, 403);
    assert.equal((await write('POST', { Stamp_Name: ' ', District_ID: 7 })).status, 400);
    assert.equal((await write('POST', { Stamp_Name: 'x'.repeat(201), District_ID: 7 })).status, 400);
    assert.equal((await write('POST', { Stamp_Name: 'ชื่อ', District_ID: 1.5 })).status, 400);
    assert.equal((await write('POST', { Stamp_Name: 'ชื่อ', District_ID: 999 })).status, 400);
    assert.equal((await write('PATCH', { Stamp_Name: '' }, '/1')).status, 400);
    assert.equal((await write('PATCH', { District_ID: 8 }, '/1')).status, 400);
    assert.equal((await write('PATCH', { Stamp_Name: 'ชื่อใหม่' }, '/999')).status, 404);
    for (const minSpend of [0, -1, 1.001, '150', 1e10]) {
      assert.equal((await write('PATCH', { minSpend, rewardCount: 1 }, '/districts/7')).status, 400);
    }
    for (const rewardCount of [0, -1, 1.5, 101, '2']) {
      assert.equal((await write('PATCH', { minSpend: 150, rewardCount }, '/districts/7')).status, 400);
    }
    assert.equal((await write('PATCH', { minSpend: 150, rewardCount: 2 }, '/districts/999')).status, 404);
    assert.equal(writes, 0);

    const list = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(list.status, 200);
    assert.deepEqual(await list.json(), [
      { districtId: 7, districtName: 'สามพราน', provinceId: 1, provinceName: 'นครปฐม', stampName: 'แสตมป์สามพราน', issuedCount: 15, minSpend: 150, rewardCount: 1 },
      { districtId: 8, districtName: 'นครชัยศรี', provinceId: 1, provinceName: 'นครปฐม', stampName: 'แสตมป์นครชัยศรี', issuedCount: 0, minSpend: 150, rewardCount: 1 },
    ]);
    const created = await write('POST', { Stamp_Name: '  แสตมป์ใหม่  ', District_ID: 7 });
    assert.equal(created.status, 201);
    assert.equal((await created.json() as typeof record).Stamp_Name, 'แสตมป์ใหม่');
    const updated = await write('PATCH', { Stamp_Name: '  สามพรานของดี  ' }, '/1');
    assert.equal(updated.status, 200);
    const result = await updated.json() as typeof record;
    assert.equal(result.Stamp_Name, 'สามพรานของดี');
    assert.equal(result.District_ID, 7);
    assert.equal(result._count.user_stamps, 12);
    assert.equal(writes, 2);
    const configured = await write('PATCH', { minSpend: 200.50, rewardCount: 2 }, '/districts/7');
    assert.equal(configured.status, 200);
    assert.deepEqual(await configured.json(), { districtId: 7, minSpend: 200.50, rewardCount: 2 });
    const publicRule = await fetch(url.replace('/admin/stamps', '/public/districts/7/stamp-rule'));
    assert.equal(publicRule.status, 200);
    assert.deepEqual(await publicRule.json(), { minSpend: 200.50, rewardCount: 2, stampName: 'แสตมป์สามพราน' });
    assert.equal(writes, 3);
  } finally {
    destroySession(token); destroySession(citizen);
    (prisma.districts as any).findMany = originals.list;
    (prisma.district_stamps as any).findUnique = originals.find;
    (prisma.district_stamps as any).create = originals.create;
    (prisma.district_stamps as any).update = originals.update;
    (prisma.districts as any).findUnique = originals.district;
    (prisma.districts as any).update = originals.districtUpdate;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
