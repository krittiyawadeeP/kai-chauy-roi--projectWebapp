import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeAnalysisHours } from './analysis-hours';

const mission = (id: number, merchantId: number, start: number, end: number, revenue: number) => ({
  id, merchantId, dailyStartMinute: start * 60, dailyEndMinute: end * 60,
  evidence: { hourlySales: [{ hour: 14, averageRevenue: revenue, daysWithSales: 5 }] },
});

test('overview sums store averages and counts overlapping mission hours independently of sales data', () => {
  const { points, shopCount } = summarizeAnalysisHours([
    mission(1, 10, 14, 16, 100), mission(2, 20, 15, 17, 200), mission(3, 30, 15, 16, 50),
  ]);
  assert.equal(shopCount, 3);
  assert.equal(points.length, 24);
  assert.equal(points[14].revenue, 350);
  assert.equal(points[14].missionCount, 1);
  assert.equal(points[15].missionCount, 3);
  assert.equal(points[15].mission, true);
  assert.equal(points[15].revenue, null, 'missing bills remain unknown even when missions are scheduled');
  assert.equal(points[16].missionCount, 1);
  assert.equal(points[17].missionCount, 0);
  assert.equal(points[17].mission, false);
});

test('historical missions do not duplicate a store and filtered or empty views are recomputed', () => {
  const latest = mission(5, 10, 16, 18, 25);
  const { points, shopCount } = summarizeAnalysisHours([latest, mission(1, 10, 14, 16, 100)]);
  assert.equal(shopCount, 1);
  assert.equal(points[14].revenue, 25);
  assert.equal(points[14].missionCount, 0);
  assert.equal(points[16].missionCount, 1);
  const empty = summarizeAnalysisHours([]);
  assert.equal(empty.shopCount, 0);
  assert.ok(empty.points.every(point => point.revenue === null && point.missionCount === 0));
});
