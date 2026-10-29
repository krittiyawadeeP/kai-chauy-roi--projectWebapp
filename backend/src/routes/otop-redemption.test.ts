import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { citizenRoutes } from './citizen.routes';

test('OTOP redemption uses the configured count while requiring distinct districts of the product province', async (t) => {
  const authFind = prisma.users.findUnique;
  (prisma.users as any).findUnique = async () => ({ Is_Suspended: false });
  t.after(() => { (prisma.users as any).findUnique = authFind; });
  const originals = { reward: prisma.rewards.findUnique, transaction: prisma.$transaction };
  let required = 3;
  let issued = 0;
  const stamp = (districtId: number, provinceId = 12) => ({ Stamp_ID: districtId, district_stamps: { District_ID: districtId, districts: { Prov_ID: provinceId } } });
  const stamps = [stamp(1201), stamp(1201), stamp(1202), stamp(5001, 50)];
  (prisma.rewards as any).findUnique = async () => ({ Reward_ID: 1, Reward_Type: 'OTOP_PRODUCT', Province_ID: 12, Required_Stamp_Count: required, Status: 'ACTIVE' });
  (prisma as any).$transaction = async (run: (tx: any) => Promise<unknown>) => run({
    $queryRaw: async () => [], districts: { count: async () => 10 }, user_stamps: { findMany: async () => stamps },
    stamp_redemptions: {
      findFirst: async () => null,
      create: async ({ data }: any) => { issued++; return { Redemption_ID: issued, ...data }; },
    },
  });
  const app = express(); app.use(express.json()); app.use(citizenRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const token = createSession(7, 'USER');
  const claim = () => fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/stamp-redemptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ Reward_ID: 1 }),
  });
  try {
    assert.equal((await claim()).status, 400, 'duplicates and other provinces cannot meet the count');
    assert.equal(issued, 0);
    stamps.push(stamp(1203));
    assert.equal((await claim()).status, 201, 'three districts qualify even though the old 80 percent rule required eight');
    assert.equal(issued, 1);
    required = 4;
    assert.equal((await claim()).status, 400, 'a new configured requirement takes effect');
    assert.equal(issued, 1);
  } finally {
    destroySession(token);
    (prisma.rewards as any).findUnique = originals.reward;
    (prisma as any).$transaction = originals.transaction;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
