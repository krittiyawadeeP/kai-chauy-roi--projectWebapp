import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';

import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { adminRoutes } from './admin.routes';

test('OTOP reward uses province district threshold and stores image/source links', async () => {
  const originalCount = prisma.districts.count;
  const originalCreate = prisma.rewards.create;
  let created: Record<string, any> | undefined;
  let creationCount = 0;
  (prisma.districts as any).count = async () => 10;
  (prisma.rewards as any).create = async ({ data }: any) => { created = data; creationCount++; return { Reward_ID: 1, ...data }; };
  const app = express();
  app.use(express.json()); app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const token = createSession(1, 'ADMIN');
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/admin/rewards`;
  const post = (body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  try {
    const body = { Reward_Name: 'สินค้า OTOP', Reward_Type: 'OTOP_PRODUCT', Province_ID: 12, Image_URL: 'https://example.com/image.jpg', Source_URL: 'https://example.com/product', Status: 'ACTIVE' };
    assert.equal((await post({ ...body, Source_URL: 'javascript:bad' })).status, 400);
    assert.equal(creationCount, 0);
    assert.equal((await post({ ...body, Source_URL: '' })).status, 201);
    assert.ok(created);
    assert.equal(created.Required_Stamp_Count, 8);
    assert.equal(created.Province_ID, 12);
    assert.equal(created.Image_URL, body.Image_URL);
  } finally {
    destroySession(token);
    (prisma.districts as any).count = originalCount;
    (prisma.rewards as any).create = originalCreate;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
