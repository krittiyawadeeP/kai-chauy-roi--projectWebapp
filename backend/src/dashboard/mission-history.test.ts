import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMissionHistory, missionDay, type HistoryMission, type MissionWindow } from './mission-history';

export const missionFixture = (overrides: Partial<HistoryMission> = {}): HistoryMission => ({
  Mission_ID: 1, Target_Merchant_ID: 5, Mission_Name: 'กระตุ้นยอดขายช่วงเช้า', Description: 'อุดหนุนร้านชุมชน',
  Start_DateTime: new Date('2026-10-20T03:00:00Z'), End_DateTime: new Date('2026-10-20T05:00:00Z'),
  Status: 'ACTIVE', Max_Recipients: 50, merchants: { Shop_Name: 'ร้านตัวอย่าง' },
  daily_mission_analysis: { Analysis_Date: new Date('2026-10-18T00:00:00Z'), provinces: { Prov_Name: 'Bangkok' } },
  _count: { user_stamps: 12 }, ...overrides,
});
const sale = (at: string, amount: number, merchantId = 5) => ({ Merchant_ID: merchantId, Tx_Timestamp: new Date(at), Total_Amount: amount });
const now = new Date('2026-10-21T05:00:00Z');
const entries = (report: ReturnType<typeof buildMissionHistory>) => report.provinces.flatMap(province => province.missions);

test('history validates calendar dates and uses Bangkok day boundaries', () => {
  assert.equal(missionDay('2026-02-30'), null);
  assert.equal(missionDay('2026-1-2'), null);
  assert.equal(missionDay('not-a-date'), null);
  assert.equal(missionDay('2026-10-20')?.start.toISOString(), '2026-10-19T17:00:00.000Z');
  assert.equal(missionDay('2026-10-20')?.end.toISOString(), '2026-10-20T17:00:00.000Z');
  const crossingMidnight = missionFixture({ Start_DateTime: new Date('2026-10-20T16:30:00Z'), End_DateTime: new Date('2026-10-20T18:00:00Z') });
  assert.equal(entries(buildMissionHistory('2026-10-21', [crossingMidnight], [], [], now)).length, 1);
  assert.equal(entries(buildMissionHistory('2026-10-22', [crossingMidnight], [], [], now)).length, 0);
  const endsAtMidnight = missionFixture({ Start_DateTime: new Date('2026-10-20T16:00:00Z'), End_DateTime: new Date('2026-10-20T17:00:00Z') });
  assert.equal(entries(buildMissionHistory('2026-10-21', [endsAtMidnight], [], [], now)).length, 0);
});

test('all 77 provinces remain visible without missions and manual missions are excluded', () => {
  const report = buildMissionHistory('2026-10-20', [missionFixture({ daily_mission_analysis: null })], [], [], now);
  assert.equal(report.provinces.length, 77);
  assert.equal(new Set(report.provinces.map(province => province.code)).size, 77);
  assert.equal(report.summary.missionCount, 0);
  assert.equal(report.summary.actualRevenue, null);
  assert.equal(report.summary.revenueChangePercent, null);
  assert.ok(report.provinces.every(province => !province.missions.length));
});

test('compares completed sales against same weekday and hours, using the same cohorts in dashboard totals', () => {
  const report = buildMissionHistory('2026-10-20', [missionFixture()], [
    sale('2026-10-20T03:00:00Z', 100), sale('2026-10-20T04:59:59Z', 200),
    sale('2026-10-20T05:00:00Z', 999), sale('2026-10-20T04:00:00Z', 999, 8),
    sale('2026-10-13T03:00:00Z', 100), sale('2026-10-06T04:00:00Z', 200),
    sale('2026-10-12T04:00:00Z', 999),
  ], [], now);
  const entry = entries(report)[0];
  assert.equal(report.provinces.find(province => province.code === '10')?.missions[0].id, 1);
  assert.equal(entry.phase, 'FINISHED');
  assert.deepEqual(entry.performance, {
    actualRevenue: 300, actualTransactions: 2, baselineRevenue: 150, baselineTransactions: 1,
    revenueChangePercent: 100, revenueDifference: 150,
    referenceDates: ['2026-10-13', '2026-10-06'], reason: null,
  });
  assert.equal(report.summary.comparableCount, 1);
  assert.equal(report.summary.increasedCount, 1);
  assert.equal(report.summary.revenueChangePercent, 100);
  assert.equal(report.summary.actualTransactions, 2);
});

test('weekly AI history counts only its daily active hours and keeps unlimited quota', () => {
  const weekly = missionFixture({
    Start_DateTime: new Date('2026-10-25T17:00:00Z'), End_DateTime: new Date('2026-11-01T17:00:00Z'),
    Campaign_Week_Start: new Date('2026-10-26T00:00:00Z'), Daily_Start_Minute: 720, Daily_End_Minute: 840,
    Max_Recipients: null, daily_mission_analysis: null,
    merchants: { Shop_Name: 'ร้านตัวอย่าง', districts: { provinces: { Prov_Name: 'Bangkok' } } },
  });
  const report = buildMissionHistory('2026-10-27', [weekly], [
    sale('2026-10-27T05:00:00Z', 100), sale('2026-10-27T07:00:00Z', 900),
    sale('2026-10-26T05:00:00Z', 400), sale('2026-10-28T05:00:00Z', 800),
    sale('2026-10-20T05:00:00Z', 100), sale('2026-10-13T05:00:00Z', 100),
  ], [], new Date('2026-10-28T08:00:00Z'));
  const entry = entries(report)[0];
  assert.equal(entry.quota, null);
  assert.equal(entry.performance.actualRevenue, 100);
  assert.equal(entry.performance.baselineRevenue, 100);
  assert.equal(entry.phase, 'FINISHED', 'a completed day can be compared while its weekly campaign is still running');
  assert.equal(report.summary.recordedRevenue, 100);
  assert.equal(report.hourlySales[12].revenue, 100);
  assert.equal(report.hourlySales[12].mission, true);
  assert.equal(report.hourlySales[13].mission, true);
  assert.equal(report.hourlySales[14].mission, false);
  assert.equal(report.hourlySales[14].revenue, 900, 'the chart includes other hours for context');
});

test('sparse historical evidence stays unknown while zero recorded mission sales can be measured', () => {
  const references = [sale('2026-10-13T04:00:00Z', 100), sale('2026-10-06T04:00:00Z', 100)];
  const sparse = buildMissionHistory('2026-10-20', [missionFixture()], references.slice(0, 1), [], now);
  assert.equal(entries(sparse)[0].performance.reason, 'INSUFFICIENT_REFERENCE');
  assert.equal(entries(sparse)[0].performance.baselineRevenue, null);
  assert.equal(sparse.summary.comparableCount, 0);
  const zero = buildMissionHistory('2026-10-20', [missionFixture()], references, [], now);
  assert.equal(entries(zero)[0].performance.actualRevenue, 0);
  assert.equal(zero.summary.revenueChangePercent, -100);
  assert.equal(zero.summary.decreasedCount, 1);
});

test('aggregate uplift is weighted by baseline revenue and excludes missions without a reference', () => {
  const missions = [missionFixture(), missionFixture({ Mission_ID: 2, Target_Merchant_ID: 6 }), missionFixture({ Mission_ID: 3, Target_Merchant_ID: 7 })];
  const report = buildMissionHistory('2026-10-20', missions, [
    sale('2026-10-20T04:00:00Z', 1000), sale('2026-10-13T04:00:00Z', 100), sale('2026-10-06T04:00:00Z', 100),
    sale('2026-10-20T04:00:00Z', 100, 6), sale('2026-10-13T04:00:00Z', 1000, 6), sale('2026-10-06T04:00:00Z', 1000, 6),
    sale('2026-10-20T04:00:00Z', 9000, 7),
  ], [], now);
  assert.equal(report.summary.comparableCount, 2);
  assert.equal(report.summary.actualRevenue, 1100);
  assert.equal(report.summary.baselineRevenue, 1100);
  assert.equal(report.summary.revenueChangePercent, 0, 'do not average the individual +900% and -90%');
  assert.equal(report.summary.increasedCount, 1);
  assert.equal(report.summary.decreasedCount, 1);
});

test('excludes reference windows with promotions and avoids double-counting overlapping target missions', () => {
  const blockedReference: MissionWindow = { ...missionFixture(), Mission_ID: 9, Start_DateTime: new Date('2026-10-13T03:30:00Z'), End_DateTime: new Date('2026-10-13T04:30:00Z') };
  const sales = [sale('2026-10-20T04:00:00Z', 500), sale('2026-10-13T04:00:00Z', 999), sale('2026-10-06T04:00:00Z', 100), sale('2026-09-29T04:00:00Z', 300)];
  const report = buildMissionHistory('2026-10-20', [missionFixture()], sales, [blockedReference], now);
  assert.equal(entries(report)[0].performance.baselineRevenue, 200);
  assert.deepEqual(entries(report)[0].performance.referenceDates, ['2026-10-06', '2026-09-29']);
  const overlapping = missionFixture({ Mission_ID: 2 });
  const overlap = buildMissionHistory('2026-10-20', [missionFixture(), overlapping], sales, [missionFixture(), overlapping], now);
  assert.ok(entries(overlap).every(entry => entry.performance.reason === 'OVERLAPPING_MISSIONS'));
  assert.equal(overlap.summary.missionCount, 2);
  assert.equal(overlap.summary.comparableCount, 0);
  assert.equal(overlap.summary.actualRevenue, null);
  assert.equal(overlap.summary.recordedRevenue, 500);
  assert.equal(overlap.summary.recordedTransactions, 1);
});

test('upcoming, running, and cancelled missions never report a completed uplift', () => {
  for (const [at, expected] of [['2026-10-20T02:59:59Z', 'UPCOMING'], ['2026-10-20T04:00:00Z', 'RUNNING']] as const) {
    const report = buildMissionHistory('2026-10-20', [missionFixture()], [], [], new Date(at));
    assert.equal(entries(report)[0].phase, expected);
    assert.equal(entries(report)[0].performance.actualRevenue, expected === 'RUNNING' ? 0 : null);
    assert.equal(report.summary.comparableCount, 0);
  }
  const cancelled = buildMissionHistory('2026-10-20', [missionFixture({ Status: 'CANCELLED' })], [], [], now);
  assert.equal(entries(cancelled)[0].phase, 'CANCELLED');
  assert.equal(cancelled.summary.finishedCount, 0);
});

test('ongoing plan overview shows accrued sales and stamps and excludes closed, ended, and future plans', () => {
  const current = missionFixture({
    Start_DateTime: new Date('2026-10-25T17:00:00Z'), End_DateTime: new Date('2026-11-01T17:00:00Z'),
    Campaign_Week_Start: new Date('2026-10-26T00:00:00Z'), Daily_Start_Minute: 720, Daily_End_Minute: 840,
  });
  const report = buildMissionHistory('2026-10-28', [current,
    { ...current, Mission_ID: 2, Status: 'INACTIVE' },
    { ...current, Mission_ID: 3, Start_DateTime: new Date('2026-10-29T00:00:00Z') },
    { ...current, Mission_ID: 4, End_DateTime: new Date('2026-10-27T00:00:00Z') },
  ], [
    sale('2026-10-26T05:00:00Z', 100), sale('2026-10-27T06:00:00Z', 200),
    sale('2026-10-28T05:00:00Z', 300), sale('2026-10-28T06:00:00Z', 999),
    sale('2026-10-25T05:00:00Z', 999),
  ], [], new Date('2026-10-28T05:30:00Z'), 'plan');
  assert.equal(report.scope, 'plan');
  assert.equal(report.summary.missionCount, 1);
  assert.equal(report.summary.stampsIssued, 12);
  assert.equal(report.summary.recordedRevenue, 600);
  assert.equal(report.summary.recordedTransactions, 3);
  assert.equal(entries(report)[0].performance.actualRevenue, 600);
  assert.equal(report.hourlySales.length, 24);
  assert.equal(report.hourlySales[12].revenue, 400);
  assert.equal(report.hourlySales[13].revenue, 200);
  assert.equal(report.summary.comparableCount, 0);
});

test('selected-day history keeps recorded facts for retired plans without claiming a completed comparison', () => {
  const report = buildMissionHistory('2026-10-20', [missionFixture({ Status: 'INACTIVE' })], [sale('2026-10-20T04:00:00Z', 250)], [], now);
  assert.equal(report.summary.stampsIssued, 12);
  assert.equal(report.summary.recordedRevenue, 250);
  assert.equal(report.hourlySales[11].revenue, 250);
  assert.equal(entries(report)[0].phase, 'CANCELLED');
  assert.equal(report.summary.comparableCount, 0);
});
