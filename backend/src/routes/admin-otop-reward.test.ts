import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';

import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { adminRoutes } from './admin.routes';

test('OTOP reward defaults to the district threshold but supports a validated custom count on create and edit', async () => {
  const originalCount = prisma.districts.count;
  const originalCreate = prisma.rewards.create;
  const originalFind = prisma.rewards.findUnique;
  const originalUpdate = prisma.rewards.update;
  let created: Record<string, any> | undefined;
  let creationCount = 0;
  (prisma.districts as any).count = async () => 10;
  (prisma.rewards as any).create = async ({ data }: any) => { created = data; creationCount++; return { Reward_ID: 1, ...data }; };
  (prisma.rewards as any).findUnique = async () => ({ Reward_ID: 1, ...created });
  (prisma.rewards as any).update = async ({ data }: any) => { created = { ...created, ...data }; return { Reward_ID: 1, ...created }; };
  const app = express();
  app.use(express.json()); app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const token = createSession(1, 'ADMIN');
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/admin/rewards`;
  const post = (body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const patch = (body: unknown) => fetch(url + '/1', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  try {
    const body = { Reward_Name: 'สินค้า OTOP', Reward_Type: 'OTOP_PRODUCT', Province_ID: 12, Image_URL: 'https://example.com/image.jpg', Source_URL: 'https://example.com/product', Status: 'ACTIVE' };
    assert.equal((await post({ ...body, Source_URL: 'javascript:bad' })).status, 400);
    assert.equal(creationCount, 0);
    assert.equal((await post({ ...body, Source_URL: '' })).status, 201);
    assert.ok(created);
    assert.equal(created.Required_Stamp_Count, 8);
    assert.equal(created.Province_ID, 12);
    assert.equal(created.Image_URL, body.Image_URL);
    for (const value of [0, -1, 1.5, 11, null, '3']) {
      assert.equal((await post({ ...body, Required_Stamp_Count: value })).status, 400);
    }
    assert.equal(creationCount, 1);
    assert.equal((await post({ ...body, Required_Stamp_Count: 3 })).status, 201);
    assert.equal(created.Required_Stamp_Count, 3);
    assert.equal((await patch({ Required_Stamp_Count: 5 })).status, 200);
    assert.equal(created.Required_Stamp_Count, 5);
    assert.equal((await patch({ Reward_Name: 'ชื่อใหม่' })).status, 200);
    assert.equal(created.Required_Stamp_Count, 5, 'editing other details preserves the configured count');
    assert.equal((await patch({ Required_Stamp_Count: 11 })).status, 400);
    assert.equal(created.Required_Stamp_Count, 5);
  } finally {
    destroySession(token);
    (prisma.districts as any).count = originalCount;
    (prisma.rewards as any).create = originalCreate;
    (prisma.rewards as any).findUnique = originalFind;
    (prisma.rewards as any).update = originalUpdate;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
