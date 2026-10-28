import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { adminRoutes } from '../routes/admin.routes';
import type { MissionHistoryReport } from '../../../shared/mission-history';

test('history API guards access, validates dates, selects only analysed missions and rejects manual creation', async () => {
  const originals = { missions: prisma.missions.findMany, sales: prisma.sales_transactions.findMany };
  let missionReads = 0;
  let salesReads = 0;
  const mission = {
    Mission_ID: 1, Daily_Analysis_ID: 8, Target_Merchant_ID: 5, Mission_Name: 'ภารกิจทดสอบ', Description: null,
    Start_DateTime: new Date('2026-10-20T03:00:00Z'), End_DateTime: new Date('2026-10-20T05:00:00Z'),
    Status: 'ACTIVE', Max_Recipients: 50, merchants: { Shop_Name: 'ร้านทดสอบ' },
    daily_mission_analysis: { Analysis_Date: new Date('2026-10-18T00:00:00Z'), provinces: { Prov_Name: 'กรุงเทพมหานคร' } },
    _count: { user_stamps: 10 },
  };
  (prisma.missions as any).findMany = async (query: any) => {
    missionReads++;
    if (query.include) {
      assert.deepEqual(query.where.OR, [{ Daily_Analysis_ID: { not: null } }, { Campaign_Week_Start: { not: null } }]);
      assert.equal(query.where.Start_DateTime.lt.toISOString(), '2026-10-20T17:00:00.000Z');
      assert.equal(query.where.End_DateTime.gt.toISOString(), '2026-10-19T17:00:00.000Z');
      const stampPeriod = query.include._count.select.user_stamps.where.Earned_At;
      assert.equal(stampPeriod.gte.toISOString(), '2026-10-19T17:00:00.000Z');
      assert.equal(stampPeriod.lt.toISOString(), '2026-10-20T17:00:00.000Z');
    }
    return [mission];
  };
  (prisma.sales_transactions as any).findMany = async (query: any) => {
    salesReads++;
    assert.deepEqual(query.where.Status.in, ['COMPLETED', 'completed']);
    assert.deepEqual(query.where.Merchant_ID.in, [5]);
    assert.equal(query.where.Tx_Timestamp.gte.toISOString(), '2026-09-21T17:00:00.000Z');
    return [
      { Merchant_ID: 5, Tx_Timestamp: new Date('2026-10-20T04:00:00Z'), Total_Amount: 300 },
      { Merchant_ID: 5, Tx_Timestamp: new Date('2026-10-13T04:00:00Z'), Total_Amount: 100 },
      { Merchant_ID: 5, Tx_Timestamp: new Date('2026-10-06T04:00:00Z'), Total_Amount: 200 },
    ];
  };
  const app = express(); app.use(express.json()); app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/admin`;
  const admin = createSession(1, 'ADMIN'); const citizen = createSession(2, 'USER');
  const headers = { Authorization: `Bearer ${admin}` };
  try {
    assert.equal((await fetch(url + '/mission-history?date=2026-10-20')).status, 401);
    assert.equal((await fetch(url + '/mission-history?date=2026-10-20', { headers: { Authorization: `Bearer ${citizen}` } })).status, 403);
    for (const query of ['date=2026-02-30', 'date=bad', 'date=2026-10-20&date=2026-10-21', 'scope=bad']) {
      assert.equal((await fetch(url + '/mission-history?' + query, { headers })).status, 400);
    }
    assert.equal(missionReads, 0);
    const response = await fetch(url + '/mission-history?date=2026-10-20', { headers });
    assert.equal(response.status, 200);
    const report = await response.json() as MissionHistoryReport;
    assert.equal(report.provinces.length, 77);
    assert.equal(report.summary.revenueChangePercent, 100);
    assert.equal(report.summary.missionCount, 1);
    assert.equal(report.summary.comparableCount, 1);
    assert.equal(report.scope, 'day');
    assert.equal(report.summary.stampsIssued, 10);
    assert.equal(salesReads, 1, 'sales are fetched in one bounded batch');
    const manual = await fetch(url + '/missions', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ Mission_Name: 'manual' }) });
    assert.equal(manual.status, 405);
    assert.equal(manual.headers.get('Allow'), 'GET');
    (prisma.missions as any).findMany = async () => [];
    const empty = await (await fetch(url + '/mission-history?date=2026-10-20', { headers })).json() as MissionHistoryReport;
    assert.equal(empty.provinces.length, 77);
    assert.equal(empty.summary.comparableCount, 0);
    assert.equal(salesReads, 1, 'empty history does not scan transactions');
  } finally {
    destroySession(admin); destroySession(citizen);
    (prisma.missions as any).findMany = originals.missions;
    (prisma.sales_transactions as any).findMany = originals.sales;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
