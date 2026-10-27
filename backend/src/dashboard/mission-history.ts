import { PROVINCES } from '../../../shared/geography';
import { findProvince } from '../../../shared/regions';
import type { MissionHistoryEntry, MissionHistoryReport, MissionPhase } from '../../../shared/mission-history';
import { bangkokDate } from '../lib/sales-mission';

const week = 7 * 86_400_000;
export type MissionWindow = { Mission_ID: number; Target_Merchant_ID: number; Start_DateTime: Date; End_DateTime: Date; Status: string };
export type HistoryMission = MissionWindow & {
  Mission_Name: string; Description: string | null; Max_Recipients: number;
  merchants: { Shop_Name: string };
  daily_mission_analysis: { Analysis_Date: Date; provinces: { Prov_Name: string } } | null;
  _count: { user_stamps: number };
};
export type HistorySale = { Merchant_ID: number; Tx_Timestamp: Date; Total_Amount: unknown };

export function missionDay(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const start = new Date(`${date}T00:00:00+07:00`);
  if (!Number.isFinite(start.getTime()) || bangkokDate(start) !== date) return null;
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

const inactive = (status: string) => ['CANCELLED', 'CANCELED', 'INACTIVE'].includes(status.toUpperCase());
const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;
const percent = (actual: number, baseline: number) => baseline > 0 ? Math.round((actual - baseline) / baseline * 10_000) / 100 : null;
const money = (value: number) => Math.round(value * 100) / 100;

export function buildMissionHistory(date: string, missions: HistoryMission[], sales: HistorySale[], windows: MissionWindow[], now = new Date()): MissionHistoryReport {
  const day = missionDay(date);
  if (!day) throw new Error('Invalid mission date');
  const provinces = PROVINCES.map(province => ({ code: province.code, name: province.name, region: province.region, missions: [] as MissionHistoryEntry[] }));
  const salesByMerchant = new Map<number, HistorySale[]>();
  for (const sale of sales) {
    const items = salesByMerchant.get(sale.Merchant_ID) ?? [];
    items.push(sale); salesByMerchant.set(sale.Merchant_ID, items);
  }

  for (const mission of missions) {
    const analysis = mission.daily_mission_analysis;
    const province = analysis && findProvince(analysis.provinces.Prov_Name);
    const row = provinces.find(item => item.code === province?.code);
    const start = mission.Start_DateTime.getTime();
    const end = mission.End_DateTime.getTime();
    if (!row || !analysis || !overlaps(start, end, day.start.getTime(), day.end.getTime())) continue;
    const phase: MissionPhase = inactive(mission.Status) ? 'CANCELLED' : now.getTime() < start ? 'UPCOMING' : now.getTime() < end ? 'RUNNING' : 'FINISHED';
    const performance: MissionHistoryEntry['performance'] = {
      actualRevenue: null, actualTransactions: null, baselineRevenue: null, baselineTransactions: null,
      revenueChangePercent: null, revenueDifference: null, referenceDates: [], reason: 'NOT_FINISHED',
    };
    if (phase === 'FINISHED') {
      const merchantSales = salesByMerchant.get(mission.Target_Merchant_ID) ?? [];
      const sum = (from: number, to: number) => {
        const items = merchantSales.filter(sale => sale.Tx_Timestamp.getTime() >= from && sale.Tx_Timestamp.getTime() < to);
        return { cents: items.reduce((total, sale) => total + Math.round(Number(sale.Total_Amount) * 100), 0), count: items.length };
      };
      const actual = sum(start, end);
      performance.actualRevenue = actual.cents / 100; performance.actualTransactions = actual.count;
      const otherMissions = windows.filter(item => item.Mission_ID !== mission.Mission_ID && item.Target_Merchant_ID === mission.Target_Merchant_ID && !inactive(item.Status));
      if (otherMissions.some(item => overlaps(start, end, item.Start_DateTime.getTime(), item.End_DateTime.getTime()))) {
        performance.reason = 'OVERLAPPING_MISSIONS';
      } else {
        let referenceCents = 0; let referenceBills = 0;
        for (let weeksAgo = 1; weeksAgo <= 4; weeksAgo++) {
          const from = start - weeksAgo * week; const to = end - weeksAgo * week;
          if (to > start || otherMissions.some(item => overlaps(from, to, item.Start_DateTime.getTime(), item.End_DateTime.getTime()))) continue;
          const reference = sum(from, to);
          // No bills cannot establish whether the shop was open; do not turn missing evidence into zero sales.
          if (!reference.count) continue;
          referenceCents += reference.cents; referenceBills += reference.count;
          performance.referenceDates.push(bangkokDate(new Date(from)));
        }
        const samples = performance.referenceDates.length;
        if (samples < 2) performance.reason = 'INSUFFICIENT_REFERENCE';
        else {
          performance.reason = null;
          performance.baselineRevenue = Math.round(referenceCents / samples) / 100;
          performance.baselineTransactions = Math.round(referenceBills / samples * 100) / 100;
          performance.revenueDifference = money(performance.actualRevenue - performance.baselineRevenue);
          performance.revenueChangePercent = percent(performance.actualRevenue, performance.baselineRevenue);
        }
      }
    }
    row.missions.push({
      id: mission.Mission_ID, name: mission.Mission_Name, description: mission.Description,
      merchantId: mission.Target_Merchant_ID, shopName: mission.merchants.Shop_Name,
      analysisDate: analysis.Analysis_Date.toISOString().slice(0, 10), start: mission.Start_DateTime.toISOString(), end: mission.End_DateTime.toISOString(),
      phase, quota: mission.Max_Recipients, recipients: mission._count.user_stamps, performance,
    });
  }
  const entries = provinces.flatMap(province => province.missions);
  const comparable = entries.filter(entry => entry.performance.reason === null);
  const actualRevenue = comparable.length ? money(comparable.reduce((total, entry) => total + entry.performance.actualRevenue!, 0)) : null;
  const baselineRevenue = comparable.length ? money(comparable.reduce((total, entry) => total + entry.performance.baselineRevenue!, 0)) : null;
  return {
    date, generatedAt: now.toISOString(), provinces,
    summary: {
      missionCount: entries.length, provinceCount: provinces.filter(province => province.missions.length).length,
      finishedCount: entries.filter(entry => entry.phase === 'FINISHED').length,
      runningCount: entries.filter(entry => entry.phase === 'RUNNING').length,
      upcomingCount: entries.filter(entry => entry.phase === 'UPCOMING').length,
      comparableCount: comparable.length,
      increasedCount: comparable.filter(entry => entry.performance.revenueDifference! > 0).length,
      decreasedCount: comparable.filter(entry => entry.performance.revenueDifference! < 0).length,
      unchangedCount: comparable.filter(entry => entry.performance.revenueDifference === 0).length,
      actualRevenue, baselineRevenue,
      revenueDifference: actualRevenue === null || baselineRevenue === null ? null : money(actualRevenue - baselineRevenue),
      revenueChangePercent: actualRevenue === null || baselineRevenue === null ? null : percent(actualRevenue, baselineRevenue),
      actualTransactions: comparable.length ? comparable.reduce((total, entry) => total + entry.performance.actualTransactions!, 0) : null,
      baselineTransactions: comparable.length ? money(comparable.reduce((total, entry) => total + entry.performance.baselineTransactions!, 0)) : null,
    },
  };
}
