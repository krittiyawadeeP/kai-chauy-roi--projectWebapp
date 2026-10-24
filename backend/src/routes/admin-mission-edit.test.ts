import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { adminRoutes } from './admin.routes';

test('admin can edit an existing mission, while invalid changes leave it untouched', async () => {
  const mission = {
    Mission_ID: 3, Mission_Name: 'ภารกิจเดิม', Description: 'รายละเอียดเดิม',
    Target_Merchant_ID: 12, Max_Recipients: 50,
    Start_DateTime: new Date('2026-10-26T07:00:00Z'),
    End_DateTime: new Date('2026-10-26T09:00:00Z'), Status: 'ACTIVE',
  };
  const originalFind = prisma.missions.findUnique;
  const originalUpdate = prisma.missions.update;
  const originalCount = prisma.user_stamps.count;
  let updates = 0;
  (prisma.missions as any).findUnique = async () => mission;
  (prisma.user_stamps as any).count = async () => 2;
  (prisma.missions as any).update = async ({ data }: any) => {
    updates++;
    Object.assign(mission, data);
    return mission;
  };
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const token = createSession(1, 'ADMIN');
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/admin/missions/3`;
  const patch = (body: unknown) => fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  try {
    assert.equal((await patch({ Max_Recipients: 0 })).status, 400);
    assert.equal((await patch({ Max_Recipients: 1 })).status, 400);
    assert.equal((await patch({ Start_DateTime: 'invalid' })).status, 400);
    assert.equal(updates, 0);
    const response = await patch({ Mission_Name: 'ภารกิจที่แก้ไข', Max_Recipients: 60, Description: 'รายละเอียดใหม่' });
    assert.equal(response.status, 200);
    assert.equal(updates, 1);
    assert.equal(mission.Mission_Name, 'ภารกิจที่แก้ไข');
    assert.equal(mission.Max_Recipients, 60);
  } finally {
    destroySession(token);
    (prisma.missions as any).findUnique = originalFind;
    (prisma.missions as any).update = originalUpdate;
    (prisma.user_stamps as any).count = originalCount;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
