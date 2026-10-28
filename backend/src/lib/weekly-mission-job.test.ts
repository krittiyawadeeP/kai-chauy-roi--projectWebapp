import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignWeek, hourlySales, rankWeeklyMerchants, runWeeklyMissionAnalysis } from './weekly-mission-job';
import { prisma } from './prisma';

const sale = (date: string, amount: number) => ({ Tx_Timestamp: new Date(`${date}T12:00:00+07:00`), Total_Amount: { toString: () => String(amount) } });

test('weekly campaign starts at Bangkok Monday midnight and lasts seven days', () => {
  const week = campaignWeek(new Date('2026-10-25T05:00:00Z'));
  assert.equal(week.start.toISOString(), '2026-10-25T17:00:00.000Z');
  assert.equal(week.end.toISOString(), '2026-11-01T17:00:00.000Z');
  assert.equal(campaignWeek(new Date('2026-10-28T05:00:00Z')).start.toISOString(), '2026-10-25T17:00:00.000Z');
  const sundayRefresh = campaignWeek(new Date('2026-11-01T06:00:00Z'), true);
  assert.equal(sundayRefresh.start.toISOString(), '2026-10-25T17:00:00.000Z');
  assert.equal(sundayRefresh.end.toISOString(), '2026-11-01T17:00:00.000Z');
});

test('selects at most two declining merchants in different districts with a daily two-hour slot', () => {
  const recentDates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-17', '2026-10-18'];
  const referenceDates = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-26', '2026-09-27'];
  const merchant = (id: number, districtId: number, recentAmount: number) => ({
    id, districtId, recent: recentDates.flatMap(date => [sale(date, recentAmount), sale(date, recentAmount)]),
    reference: referenceDates.flatMap(date => [sale(date, 100), sale(date, 100)]),
  });
  const result = rankWeeklyMerchants([merchant(1, 10, 30), merchant(2, 10, 40), merchant(3, 11, 50), merchant(4, 12, 90)]);
  assert.deepEqual(result.map(item => item.id), [1, 3]);
  assert.equal(result[0].startMinute, 12 * 60);
  assert.equal(result[0].endMinute, 14 * 60);
  assert.deepEqual(result[0].hourlySales, [{ hour: 12, averageRevenue: 60, daysWithSales: 5 }]);
});

test('hourly analysis keeps adjacent hours separate and uses Bangkok dates', () => {
  assert.deepEqual(hourlySales([
    sale('2026-10-26', 100), sale('2026-10-26', 200), sale('2026-10-27', 100),
    { Tx_Timestamp: new Date('2026-10-26T06:00:00Z'), Total_Amount: 50 },
    { Tx_Timestamp: new Date('2026-10-26T17:00:00Z'), Total_Amount: 75 },
  ]), [
    { hour: 0, averageRevenue: 75, daysWithSales: 1 },
    { hour: 12, averageRevenue: 200, daysWithSales: 2 },
    { hour: 13, averageRevenue: 50, daysWithSales: 1 },
  ]);
});

test('manual analysis closes the current missions and creates a new set through Sunday', async () => {
  const original = {
    merchants: prisma.merchants.findMany, sales: prisma.sales_transactions.findMany,
    missions: prisma.missions.findMany, policy: prisma.ai_mission_policy.findFirst,
    transaction: prisma.$transaction, fetch: globalThis.fetch,
  };
  const operations: { kind: string; data: any }[] = [];
  const rows = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-26', '2026-09-27'].flatMap(date => [sale(date, 100), sale(date, 100)]);
  rows.push(...['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-24', '2026-10-25'].flatMap(date => [sale(date, 30), sale(date, 30)]));
  try {
    (prisma.merchants as any).findMany = async () => [{ Mch_ID: 1, Shop_Name: 'ร้านหนึ่ง', Category: null, Dist_ID: 5, districts: { Prov_ID: 10 } }];
    (prisma.sales_transactions as any).findMany = async () => rows.map(item => ({ ...item, Merchant_ID: 1 }));
    (prisma.missions as any).findMany = async () => [];
    (prisma.ai_mission_policy as any).findFirst = async () => ({ Daily_Stamp_Limit: 3 });
    (prisma as any).$transaction = async (run: (tx: any) => Promise<unknown>) => run({
      $queryRaw: async () => [], ai_mission_policy: { findFirst: async () => ({ Daily_Stamp_Limit: 3 }) },
      missions: {
        updateMany: async ({ data }: any) => { operations.push({ kind: 'close', data }); },
        create: async ({ data }: any) => { operations.push({ kind: 'create', data }); },
      },
    });
    globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: JSON.stringify({ name: 'ช่วยร้านหนึ่ง', description: 'อุดหนุนร้านหนึ่ง' }) } }), { status: 200 });
    assert.equal(await runWeeklyMissionAnalysis(new Date('2026-10-28T05:00:00Z'), true), 1);
    assert.deepEqual(operations.map(item => item.kind), ['close', 'create']);
    assert.equal(operations[0].data.Status, 'INACTIVE');
    assert.equal(operations[1].data.Status, 'ACTIVE');
    assert.equal(operations[1].data.Start_DateTime.toISOString(), '2026-10-28T05:00:00.000Z');
    assert.equal(operations[1].data.End_DateTime.toISOString(), '2026-11-01T17:00:00.000Z');
    assert.equal(operations[1].data.Ai_Daily_Stamp_Limit, 3);
    assert.equal(operations[1].data.Selection_Evidence.hourlySales[0].averageRevenue, 60);
  } finally {
    (prisma.merchants as any).findMany = original.merchants;
    (prisma.sales_transactions as any).findMany = original.sales;
    (prisma.missions as any).findMany = original.missions;
    (prisma.ai_mission_policy as any).findFirst = original.policy;
    (prisma as any).$transaction = original.transaction;
    globalThis.fetch = original.fetch;
  }
});
