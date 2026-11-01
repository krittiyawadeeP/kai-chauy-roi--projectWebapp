import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignWeek, hourlySales, rankWeeklyMerchants, runWeeklyMissionAnalysis, suggestWeeklyMission } from './weekly-mission-job';
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
  assert.deepEqual(result[0].eligibleSlots, [{ startHour: 12, endHour: 14, daysWithSales: 5, totalRevenue: 300, averageRevenueOnDaysWithSales: 60 }]);
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
  const originalUrl = process.env.OLLAMA_BASE_URL;
  const originalModel = process.env.OLLAMA_MODEL;
  const original = {
    merchants: prisma.merchants.findMany, sales: prisma.sales_transactions.findMany,
    missions: prisma.missions.findMany, policy: prisma.ai_mission_policy.findFirst,
    transaction: prisma.$transaction, fetch: globalThis.fetch,
  };
  const operations: { kind: string; data: any }[] = [];
  let stillActive = true;
  const rows = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-26', '2026-09-27'].flatMap(date => [sale(date, 100), sale(date, 100)]);
  rows.push(...['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-24', '2026-10-25'].flatMap(date => [sale(date, 30), sale(date, 30)]));
  try {
    process.env.OLLAMA_BASE_URL = 'https://ai.example.com/';
    process.env.OLLAMA_MODEL = 'deployed-model';
    (prisma.merchants as any).findMany = async (query: any) => { assert.deepEqual(query.where.users, { Is_Suspended: false }); return [{ Mch_ID: 1, Shop_Name: 'ร้านหนึ่ง', Category: null, Dist_ID: 5, districts: { Prov_ID: 10 } }]; };
    (prisma.sales_transactions as any).findMany = async () => rows.map(item => ({ ...item, Merchant_ID: 1 }));
    (prisma.missions as any).findMany = async () => [];
    (prisma.ai_mission_policy as any).findFirst = async () => ({ Daily_Stamp_Limit: 3 });
    (prisma as any).$transaction = async (run: (tx: any) => Promise<unknown>) => run({
      merchants: { findMany: async (query: any) => { assert.deepEqual(query.where.users, { Is_Suspended: false }); return stillActive ? [{ Mch_ID: 1 }] : []; }, count: async () => stillActive ? 1 : 0 },
      $queryRaw: async () => [], ai_mission_policy: { findFirst: async () => ({ Daily_Stamp_Limit: 3 }) },
      missions: {
        count: async () => 0,
        updateMany: async ({ data }: any) => { operations.push({ kind: 'close', data }); },
        create: async ({ data }: any) => { operations.push({ kind: 'create', data }); },
      },
    });
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://ai.example.com/api/chat');
      assert.equal(JSON.parse(String(options?.body)).model, 'deployed-model');
      return new Response(JSON.stringify({ message: { content: JSON.stringify({ startHour: 12, endHour: 14, reason: 'Low average sales', name: 'ช่วยร้านหนึ่ง', description: 'อุดหนุนร้านหนึ่ง' }) } }), { status: 200 });
    };
    assert.equal(await runWeeklyMissionAnalysis(new Date('2026-10-28T05:00:00Z'), true), 1);
    assert.deepEqual(operations.map(item => item.kind), ['close', 'create']);
    assert.equal(operations[0].data.Status, 'INACTIVE');
    assert.equal(operations[1].data.Status, 'ACTIVE');
    assert.equal(operations[1].data.Mission_Name, 'ช่วยร้านหนึ่ง');
    assert.equal(operations[1].data.Start_DateTime.toISOString(), '2026-10-28T05:00:00.000Z');
    assert.equal(operations[1].data.End_DateTime.toISOString(), '2026-11-01T17:00:00.000Z');
    assert.equal(operations[1].data.Ai_Daily_Stamp_Limit, 3);
    assert.equal(operations[1].data.Selection_Evidence.hourlySales[0].averageRevenue, 60);
    assert.equal(operations[1].data.Daily_Start_Minute, 720);
    assert.equal(operations[1].data.Daily_End_Minute, 840);
    assert.equal(operations[1].data.Selection_Evidence.timeSelection, 'AI');
    assert.equal(operations[1].data.Selection_Evidence.reason, 'Low average sales');
    operations.length = 0;
    globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: JSON.stringify({ startHour: 20, endHour: 22 }) } }));
    await assert.rejects(runWeeklyMissionAnalysis(new Date('2026-10-28T05:00:00Z'), true), /outside the eligible weekly/);
    assert.equal(operations.length, 0, 'invalid AI times must preserve existing missions');
    globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: JSON.stringify({ startHour: 12, endHour: 14, reason: 'Low average sales', name: 'Mission', description: 'Visit 12:00-14:00' }) } }));
    await runWeeklyMissionAnalysis(new Date('2026-10-28T05:00:00Z'));
    assert.deepEqual(operations.map(item => item.kind), ['create']);
    assert.equal(operations[0].data.Daily_Start_Minute, 720);
    assert.equal(operations[0].data.Daily_End_Minute, 840);
    assert.equal(operations[0].data.Selection_Evidence.timeSelection, 'AI');
    stillActive = false; operations.length = 0;
    await assert.rejects(runWeeklyMissionAnalysis(new Date('2026-10-28T05:00:00Z'), true), /No merchants qualify/);
    assert.deepEqual(operations, [], 'suspension during AI generation must preserve the old missions and create no new ones');
  } finally {
    if (originalUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = originalUrl;
    if (originalModel === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = originalModel;
    (prisma.merchants as any).findMany = original.merchants;
    (prisma.sales_transactions as any).findMany = original.sales;
    (prisma.missions as any).findMany = original.missions;
    (prisma.ai_mission_policy as any).findFirst = original.policy;
    (prisma as any).$transaction = original.transaction;
    globalThis.fetch = original.fetch;
  }
});


test('AI must choose the lowest-average weekly slot and invalid answers fail without a fallback', async () => {
  const originalFetch = globalThis.fetch;
  const eligibleSlots = [
    { startHour: 10, endHour: 12, daysWithSales: 5, totalRevenue: 1000, averageRevenueOnDaysWithSales: 200 },
    { startHour: 14, endHour: 16, daysWithSales: 5, totalRevenue: 500, averageRevenueOnDaysWithSales: 100 },
  ];
  let answer: unknown = { startHour: 14, endHour: 16, reason: 'Lower average sales', name: 'Mission', description: 'Visit 14:00-16:00' };
  try {
    globalThis.fetch = async (_url, options) => {
      const request = JSON.parse(String(options?.body));
      assert.equal(request.options.temperature, 0);
      assert.equal(request.format.type, 'object');
      const data = JSON.parse(request.messages[0].content.split('Data: ')[1]);
      assert.deepEqual(data.eligibleSlots, eligibleSlots);
      return new Response(JSON.stringify({ message: { content: JSON.stringify(answer) } }));
    };
    const chosen = await suggestWeeklyMission('Shop', 0.5, eligibleSlots);
    assert.equal(chosen.startMinute, 840);
    assert.equal(chosen.endMinute, 960);
    answer = { startHour: 10, endHour: 12, reason: 'Low sales', name: 'Mission', description: 'Visit 10:00-12:00' };
    await assert.rejects(suggestWeeklyMission('Shop', 0.5, eligibleSlots), /lowest-average sales slot/);
    for (const invalid of [null, { startHour: 11, endHour: 13 }, { startHour: 10, endHour: 16 }, { startHour: '14', endHour: 16 }]) {
      answer = invalid;
      await assert.rejects(suggestWeeklyMission('Shop', 0.5, eligibleSlots), /outside the eligible weekly/);
    }
    for (const invalid of [
      { startHour: 14, endHour: 16, name: 'Mission', description: 'Visit', reason: '' },
      { startHour: 14, endHour: 16, name: 'x'.repeat(201), description: 'Visit', reason: 'Low sales' },
    ]) {
      answer = invalid;
      await assert.rejects(suggestWeeklyMission('Shop', 0.5, eligibleSlots), /incomplete weekly/);
    }
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(suggestWeeklyMission('Shop', 0.5, eligibleSlots), /Ollama request failed/);
    globalThis.fetch = async () => { throw new Error('AI offline'); };
    await assert.rejects(suggestWeeklyMission('Shop', 0.5, eligibleSlots), /AI offline/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('each shop has its own lowest-sales window and equal minima are allowed', async () => {
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-17', '2026-10-18'];
  const merchants = [1, 2].map(id => ({
    id, districtId: id,
    recent: dates.flatMap(date => [10, 14].map(hour => ({
      Tx_Timestamp: new Date(`${date}T${hour}:00:00+07:00`),
      Total_Amount: hour === (id === 1 ? 10 : 14) ? 20 : 100,
    }))),
    reference: dates.flatMap(date => [sale(date, 500), sale(date, 500)]),
  }));
  const ranked = rankWeeklyMerchants(merchants);
  assert.equal(ranked.length, 2);
  const originalFetch = globalThis.fetch;
  try {
    for (const shop of ranked) {
      const expectedHour = shop.id === 1 ? 10 : 14;
      globalThis.fetch = async (_url, options) => {
        const prompt = JSON.parse(String(options?.body)).messages[0].content;
        const data = JSON.parse(prompt.split('Data: ')[1]);
        assert.equal(data.shopName, `Shop ${shop.id}`);
        assert.deepEqual(data.eligibleSlots, shop.eligibleSlots);
        assert.equal(data.eligibleSlots.find((slot: any) => slot.startHour === expectedHour).averageRevenueOnDaysWithSales, 20);
        return Response.json({ message: { content: JSON.stringify({ startHour: expectedHour, endHour: expectedHour + 2, reason: 'Lowest average 20', name: 'Mission', description: 'Visit' }) } });
      };
      assert.equal((await suggestWeeklyMission(`Shop ${shop.id}`, shop.ratio, shop.eligibleSlots)).startMinute, expectedHour * 60);
    }
    const tied = ranked[0].eligibleSlots.map(slot => ({ ...slot, averageRevenueOnDaysWithSales: 20 }));
    globalThis.fetch = async () => Response.json({ message: { content: JSON.stringify({ startHour: 14, endHour: 16, reason: 'Tied lowest average', name: 'Mission', description: 'Visit' }) } });
    assert.equal((await suggestWeeklyMission('Tied shop', 0.5, tied)).startMinute, 840);
    // Lower total revenue does not mean a lower per-day average.
    await assert.rejects(suggestWeeklyMission('Unequal coverage', 0.5, [
      { startHour: 10, endHour: 12, daysWithSales: 10, totalRevenue: 1000, averageRevenueOnDaysWithSales: 100 },
      { startHour: 14, endHour: 16, daysWithSales: 4, totalRevenue: 800, averageRevenueOnDaysWithSales: 200 },
    ]), /lowest-average sales slot/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
