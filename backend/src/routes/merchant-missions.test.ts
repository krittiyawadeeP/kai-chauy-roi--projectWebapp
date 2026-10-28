import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { merchantRoutes } from './merchant.routes';

test('merchant missions preserve locations and completion history alongside unlimited AI conditions', async () => {
  const original = { merchant: prisma.merchants.findFirst, query: prisma.$queryRaw, stamps: prisma.user_stamps.findMany };
  (prisma.merchants as any).findFirst = async () => ({
    Mch_ID: 12, User_ID: 7, Shop_Name: 'ร้านชุมชน', Dist_ID: 7306, Category: 'FOOD_DRINK',
    districts: { Dist_Name: 'สามพราน', Prov_ID: 73, provinces: { Prov_Name: 'นครปฐม' } },
  });
  (prisma as any).$queryRaw = async (strings: TemplateStringsArray) => {
    assert(strings.join(' ').includes('Campaign_Week_Start'));
    const mission = { Mission_ID: 1, Mission_Name: 'ภารกิจ AI', Description: null, Target_Merchant_ID: 12, Status: 'ACTIVE',
      Start_DateTime: new Date('2026-10-25T17:00:00Z'), End_DateTime: new Date('2026-11-01T17:00:00Z') };
    return [
      { ...mission, Campaign_Week_Start: new Date('2026-10-26T00:00:00Z'), Max_Recipients: null, Daily_Start_Minute: 840, Daily_End_Minute: 960, Ai_Daily_Stamp_Limit: 3 },
      { ...mission, Mission_ID: 2, Mission_Name: 'ภารกิจทั่วไป', Campaign_Week_Start: null, Max_Recipients: 50 },
    ];
  };
  (prisma.user_stamps as any).findMany = async ({ where }: any) => where.Mission_ID === 1
    ? [{ User_ID: 20, Earned_At: new Date('2026-10-27T07:30:00Z') }] : [];
  const app = express(); app.use(merchantRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const token = createSession(7, 'MERCHANT');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/me/missions`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    const [ai, general] = await response.json() as any[];
    assert.equal(ai.targetDistName, 'สามพราน'); assert.equal(ai.targetProvName, 'นครปฐม');
    assert.equal(ai.targetDistId, 7306); assert.equal(ai.targetProvId, 73);
    assert.equal(ai.minSpend, null); assert.equal(ai.maxRecipients, null);
    assert.equal(ai.isAiMission, true); assert.equal(ai.dailyStampLimit, 3);
    assert.equal(ai.dailyStartMinute, 840); assert.equal(ai.dailyEndMinute, 960);
    assert.equal(ai.currentRecipients, 1);
    assert.deepEqual(ai.userCompletions, [{ userId: 20, earnedAt: '2026-10-27T07:30:00.000Z' }]);
    assert(ai.timeWindowLabel.includes('14:00') && ai.timeWindowLabel.includes('16:00'));
    assert.equal(general.minSpend, 150); assert.equal(general.maxRecipients, 50); assert.equal(general.isAiMission, false);
  } finally {
    destroySession(token);
    (prisma.merchants as any).findFirst = original.merchant;
    (prisma as any).$queryRaw = original.query;
    (prisma.user_stamps as any).findMany = original.stamps;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
