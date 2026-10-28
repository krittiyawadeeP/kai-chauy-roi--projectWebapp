import type { Region } from './regions';

export type MissionPhase = 'UPCOMING' | 'RUNNING' | 'FINISHED' | 'CANCELLED';
export type ComparisonReason = 'NOT_FINISHED' | 'INSUFFICIENT_REFERENCE' | 'OVERLAPPING_MISSIONS' | null;
export type MissionHistoryScope = 'plan' | 'day';
export interface HourlySalesPoint { hour: number; revenue: number | null; mission: boolean; missionCount?: number }

export interface MissionHistoryEntry {
  id: number; name: string; description: string | null; merchantId: number; shopName: string;
  analysisDate: string; start: string; end: string; phase: MissionPhase; quota: number | null; recipients: number;
  dailyStartMinute?: number | null; dailyEndMinute?: number | null;
  hourlySales: HourlySalesPoint[];
  performance: {
    actualRevenue: number | null; actualTransactions: number | null;
    baselineRevenue: number | null; baselineTransactions: number | null;
    revenueChangePercent: number | null; revenueDifference: number | null;
    referenceDates: string[]; reason: ComparisonReason;
  };
}

export interface MissionHistoryProvince {
  code: string; name: string; region: Region; missions: MissionHistoryEntry[];
}

export interface MissionHistoryReport {
  date: string; scope: MissionHistoryScope; generatedAt: string; provinces: MissionHistoryProvince[];
  hourlySales: HourlySalesPoint[];
  summary: {
    missionCount: number; provinceCount: number; finishedCount: number; runningCount: number; upcomingCount: number;
    comparableCount: number; increasedCount: number; decreasedCount: number; unchangedCount: number;
    actualRevenue: number | null; baselineRevenue: number | null;
    revenueDifference: number | null; revenueChangePercent: number | null;
    actualTransactions: number | null; baselineTransactions: number | null;
    stampsIssued: number; recordedRevenue: number; recordedTransactions: number;
  };
}
