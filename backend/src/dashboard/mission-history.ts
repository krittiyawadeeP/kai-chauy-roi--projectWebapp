import { PROVINCES } from '../../../shared/geography';
import { findProvince } from '../../../shared/regions';
import type { HourlySalesPoint, MissionHistoryEntry, MissionHistoryReport, MissionHistoryScope, MissionPhase } from '../../../shared/mission-history';
import { bangkokDate } from '../lib/sales-mission';

const week = 7 * 86_400_000;
export type MissionWindow = { Mission_ID: number; Target_Merchant_ID: number; Start_DateTime: Date; End_DateTime: Date; Status: string };
export type HistoryMission = MissionWindow & {
  Mission_Name: string; Description: string | null; Max_Recipients: number | null;
  Campaign_Week_Start?: Date | null; Daily_Start_Minute?: number | null; Daily_End_Minute?: number | null;
  merchants: { Shop_Name: string; districts?: { provinces: { Prov_Name: string } } };
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
const localMinute = (date: Date) => ((date.getUTCHours() + 7) % 24) * 60 + date.getUTCMinutes();
const emptyHours = (): HourlySalesPoint[] => Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0, mission: false }));

export function buildMissionHistory(date: string, missions: HistoryMission[], sales: HistorySale[], windows: MissionWindow[], now = new Date(), scope: MissionHistoryScope = 'day'): MissionHistoryReport {
  const day = missionDay(date);
  if (!day) throw new Error('Invalid mission date');
  const provinces = PROVINCES.map(province => ({ code: province.code, name: province.name, region: province.region, missions: [] as MissionHistoryEntry[] }));
  const salesByMerchant = new Map<number, HistorySale[]>();
  const chartWindows: { merchantId: number; start: number; end: number; missionStart: number; missionEnd: number; dailyStart?: number | null; dailyEnd?: number | null }[] = [];
  for (const sale of sales) {
    const items = salesByMerchant.get(sale.Merchant_ID) ?? [];
    items.push(sale); salesByMerchant.set(sale.Merchant_ID, items);
  }

  for (const mission of missions) {
    const analysis = mission.daily_mission_analysis;
    const provinceName = analysis?.provinces.Prov_Name ?? mission.merchants.districts?.provinces.Prov_Name;
    const province = provinceName ? findProvince(provinceName) : undefined;
    const row = provinces.find(item => item.code === province?.code);
    const campaignStart = mission.Start_DateTime.getTime();
    const campaignEnd = mission.End_DateTime.getTime();
    if (!row || (!analysis && !mission.Campaign_Week_Start) || (scope === 'plan'
      ? inactive(mission.Status) || campaignStart > now.getTime() || campaignEnd <= now.getTime()
      : !overlaps(campaignStart, campaignEnd, day.start.getTime(), day.end.getTime()))) continue;
    const start = scope === 'day' ? Math.max(campaignStart, day.start.getTime()) : campaignStart;
    const end = scope === 'day' ? Math.min(campaignEnd, day.end.getTime()) : campaignEnd;
    const phase: MissionPhase = inactive(mission.Status) ? 'CANCELLED' : now.getTime() < start ? 'UPCOMING' : now.getTime() < end ? 'RUNNING' : 'FINISHED';
    const performance: MissionHistoryEntry['performance'] = {
      actualRevenue: null, actualTransactions: null, baselineRevenue: null, baselineTransactions: null,
      revenueChangePercent: null, revenueDifference: null, referenceDates: [], reason: 'NOT_FINISHED',
    };
    const merchantSales = salesByMerchant.get(mission.Target_Merchant_ID) ?? [];
    const sum = (from: number, to: number) => {
      const items = merchantSales.filter(sale => {
        const timestamp = sale.Tx_Timestamp.getTime();
        if (timestamp < from || timestamp >= to) return false;
        if (mission.Daily_Start_Minute == null || mission.Daily_End_Minute == null) return true;
        const minute = localMinute(sale.Tx_Timestamp);
        return minute >= mission.Daily_Start_Minute && minute < mission.Daily_End_Minute;
      });
      return { cents: items.reduce((total, sale) => total + Math.round(Number(sale.Total_Amount) * 100), 0), count: items.length };
    };
    const hourlySales = emptyHours();
    const chartStart = scope === 'day' ? day.start.getTime() : missionDay(bangkokDate(mission.Start_DateTime))!.start.getTime();
    const chartEnd = Math.min(now.getTime(), scope === 'day' ? day.end.getTime() : end);
    const scheduledHours = new Set<number>();
    for (let timestamp = Math.floor(start / 3_600_000) * 3_600_000; timestamp < end; timestamp += 3_600_000) {
      scheduledHours.add(Math.floor(localMinute(new Date(timestamp)) / 60));
    }
    for (const point of hourlySales) {
      point.mission = mission.Daily_Start_Minute != null && mission.Daily_End_Minute != null
        ? overlaps(point.hour * 60, (point.hour + 1) * 60, mission.Daily_Start_Minute, mission.Daily_End_Minute)
        : scheduledHours.has(point.hour);
    }
    if (phase !== 'CANCELLED' || scope === 'day') {
      for (const sale of merchantSales) if (sale.Tx_Timestamp.getTime() >= chartStart && sale.Tx_Timestamp.getTime() < chartEnd) {
        const point = hourlySales[Math.floor(localMinute(sale.Tx_Timestamp) / 60)];
        point.revenue = money(point.revenue! + Number(sale.Total_Amount));
      }
      chartWindows.push({ merchantId: mission.Target_Merchant_ID, start: chartStart, end: chartEnd, missionStart: start, missionEnd: Math.min(end, now.getTime()), dailyStart: mission.Daily_Start_Minute, dailyEnd: mission.Daily_End_Minute });
      if (now.getTime() > start) {
        const actual = sum(start, Math.min(end, now.getTime()));
        performance.actualRevenue = actual.cents / 100; performance.actualTransactions = actual.count;
      }
    }
    if (phase === 'FINISHED') {
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
          performance.revenueDifference = money(performance.actualRevenue! - performance.baselineRevenue);
          performance.revenueChangePercent = percent(performance.actualRevenue!, performance.baselineRevenue);
        }
      }
    }
    row.missions.push({
      id: mission.Mission_ID, name: mission.Mission_Name, description: mission.Description,
      merchantId: mission.Target_Merchant_ID, shopName: mission.merchants.Shop_Name,
      analysisDate: (analysis?.Analysis_Date ?? mission.Campaign_Week_Start!).toISOString().slice(0, 10), start: mission.Start_DateTime.toISOString(), end: mission.End_DateTime.toISOString(),
      dailyStartMinute: mission.Daily_Start_Minute, dailyEndMinute: mission.Daily_End_Minute,
      phase, quota: mission.Max_Recipients, recipients: mission._count.user_stamps, hourlySales, performance,
    });
  }
  const entries = provinces.flatMap(province => province.missions);
  const comparable = entries.filter(entry => entry.performance.reason === null);
  const actualRevenue = comparable.length ? money(comparable.reduce((total, entry) => total + entry.performance.actualRevenue!, 0)) : null;
  const baselineRevenue = comparable.length ? money(comparable.reduce((total, entry) => total + entry.performance.baselineRevenue!, 0)) : null;
  const hourlySales = emptyHours();
  for (const point of hourlySales) point.mission = entries.some(entry => (scope === 'day' || entry.phase !== 'CANCELLED') && entry.hourlySales[point.hour].mission);
  let recordedCents = 0; let recordedTransactions = 0;
  for (const sale of sales) {
    const timestamp = sale.Tx_Timestamp.getTime();
    const matching = chartWindows.filter(window => window.merchantId === sale.Merchant_ID && timestamp >= window.start && timestamp < window.end);
    if (!matching.length) continue;
    const minute = localMinute(sale.Tx_Timestamp);
    const point = hourlySales[Math.floor(minute / 60)];
    point.revenue = money(point.revenue! + Number(sale.Total_Amount));
    if (matching.some(window => timestamp >= window.missionStart && timestamp < window.missionEnd &&
      (window.dailyStart == null || window.dailyEnd == null || (minute >= window.dailyStart && minute < window.dailyEnd)))) {
      recordedCents += Math.round(Number(sale.Total_Amount) * 100); recordedTransactions++;
    }
  }
  return {
    date, scope, generatedAt: now.toISOString(), provinces, hourlySales,
    summary: {
      stampsIssued: entries.reduce((total, entry) => total + entry.recipients, 0), recordedRevenue: recordedCents / 100, recordedTransactions,
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
