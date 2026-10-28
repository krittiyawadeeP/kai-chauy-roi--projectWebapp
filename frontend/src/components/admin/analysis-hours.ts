import type { HourlySalesPoint } from '../../../../shared/mission-history';
import type { WeeklyAiMission } from '../../services/adminService';

type ChartMission = Pick<WeeklyAiMission, 'id' | 'merchantId' | 'dailyStartMinute' | 'dailyEndMinute' | 'evidence'>;

export function summarizeAnalysisHours(missions: ChartMission[]) {
  const shops = new Map<number, ChartMission>();
  for (const mission of missions) {
    const previous = shops.get(mission.merchantId);
    if (!previous || mission.id > previous.id) shops.set(mission.merchantId, mission);
  }
  const points: HourlySalesPoint[] = Array.from({ length: 24 }, (_, hour) => {
    let revenue: number | null = null;
    let missionCount = 0;
    for (const mission of shops.values()) {
      const value = mission.evidence?.hourlySales?.find(point => point.hour === hour)?.averageRevenue;
      if (typeof value === 'number' && Number.isFinite(value)) revenue = (revenue ?? 0) + value;
      if (hour * 60 < mission.dailyEndMinute && (hour + 1) * 60 > mission.dailyStartMinute) missionCount++;
    }
    return { hour, revenue: revenue == null ? null : Math.round(revenue * 100) / 100, mission: missionCount > 0, missionCount };
  });
  return { points, shopCount: shops.size };
}
