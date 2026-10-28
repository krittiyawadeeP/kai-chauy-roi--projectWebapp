import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { adminRoutes } from './admin.routes';

test('only admins can list public user profile fields and accounts are separated by their merchant ownership', async () => {
  const original = prisma.users.findMany;
  let reads = 0;
  (prisma.users as any).findMany = async (query: any) => {
    reads++;
    assert.deepEqual(query.where.Role.in, ['USER', 'MERCHANT']);
    assert.equal(query.select.Password, undefined);
    assert.equal(query.select.Pin_Hash, undefined);
    assert.equal(query.select.Citizen_ID, undefined);
    assert.equal(query.select.merchants.select.Shop_Name, true);
    assert.equal(query.select.provinces, undefined);
    assert.equal(query.select.Province_ID, undefined);
    assert.equal(query.select.Subsidy_Eligible, true);
    const profile = { Name: 'ผู้ใช้งาน', Phone: '0812345678', Subsidy_Eligible: true, merchants: [] };
    const shop = { Mch_ID: 8, Shop_Name: 'ร้านชุมชน', Owner_Name: 'เจ้าของร้าน' };
    return [
      { ...profile, User_ID: 1, Role: 'USER' },
      { ...profile, User_ID: 2, Role: 'MERCHANT', merchants: [shop] },
      { ...profile, User_ID: 3, Role: 'USER', merchants: [shop] },
      { ...profile, User_ID: 4, Role: 'MERCHANT' },
    ];
  };
  const app = express(); app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/admin/users`;
  const admin = createSession(10, 'ADMIN'); const citizen = createSession(11, 'USER'); const merchant = createSession(12, 'MERCHANT');
  try {
    assert.equal((await fetch(url)).status, 401);
    for (const token of [citizen, merchant]) assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).status, 403);
    assert.equal(reads, 0);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(response.status, 200);
    const users = await response.json() as any[];
    assert.deepEqual(users.map(user => user.accountType), ['USER', 'MERCHANT', 'MERCHANT', 'MERCHANT']);
    assert.equal(users[1].merchants[0].Shop_Name, 'ร้านชุมชน');
    assert.equal(users[0].Phone, '0812345678');
    assert.equal(reads, 1);
  } finally {
    destroySession(admin); destroySession(citizen); destroySession(merchant);
    (prisma.users as any).findMany = original;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
