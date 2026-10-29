import { api } from './api';
import type { Region } from '../../../shared/regions';
import type { MissionHistoryReport } from '../../../shared/mission-history';

export interface ProvinceMetrics {
  code: string; name: string; region: Region; registered: boolean;
  totalRevenue: number; govSubsidized: number; userPaid: number; transactionCount: number;
  merchantCount: number; totalAllocated: number; totalRemaining: number;
}
export interface MerchantLocation {
  merchantId: number; shopName: string; category: string | null; lat: number; lng: number;
  provinceCode: string; provinceName: string; districtCode: string; districtName: string; region: Region;
}
export type DistrictMetrics = Omit<ProvinceMetrics, 'totalAllocated' | 'totalRemaining'> & { provinceCode: string; provinceName: string };
export interface GeographicDashboardData { generatedAt: string; provinces: ProvinceMetrics[]; districts: DistrictMetrics[]; merchants: MerchantLocation[] }

export interface DashboardData {
  transactions: {
    count: number;
    totalRevenue: number;
    govSubsidized: number;
    userPaid: number;
  };
  grants: {
    count: number;
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    activeGrants: number;
  };
}

export interface GrantRecord {
  Grant_ID: string;
  User_ID: number;
  Grant_Name: string | null;
  Total_Grant_Amount: string;
  Remaining_Amount: string;
  Granted_At: string;
  Status: string;
  users: { Citizen_ID: string; Phone: string };
}

export interface SalesMissionAnalysis {
  merchantId: number;
  shopName: string;
  periodStart: string;
  periodEnd: string;
  summary: {
    transactionCount: number;
    daysWithSales: number;
    observedOpeningTime: string | null;
    observedClosingTime: string | null;
    slots: { dayType: string; startHour: number; endHour: number; daysWithSales: number; transactionCount: number; totalRevenue: number; averageRevenueOnDaysWithSales: number }[];
  };
  suggestion: { dayType: 'weekday' | 'weekend'; startHour: number; endHour: number; reason: string; missionName: string; description: string };
}

export interface DailySalesMissionAnalysis extends SalesMissionAnalysis {
  provinceId: number;
  provinceName: string;
  analysisDate: string;
}

export interface DailyMissionRow {
  analyzedDate: string;
  provinceId: number;
  provinceName: string;
  merchantId: number | null;
  shopName: string | null;
  status: 'PENDING' | 'NO_MERCHANT' | 'INSUFFICIENT_DATA' | 'READY' | 'ERROR';
  message: string | null;
  summary: SalesMissionAnalysis['summary'] | null;
  suggestion: SalesMissionAnalysis['suggestion'] | null;
  mission: { id: number; name: string; description: string | null; start: string; end: string; quota: number; status: string } | null;
  updatedAt: string;
}

export interface DailyMissionReport { analysisDate: string; rows: DailyMissionRow[] }

export interface WeeklyAiMission {
  id: number; merchantId: number; name: string; description: string | null; shopName: string; provinceName: string; districtName: string;
  start: string; end: string; dailyStartMinute: number; dailyEndMinute: number; recipients: number; status: string; dailyStampLimit: number | null;
  evidence: { ratio?: number; recentDaily?: number; referenceDaily?: number; hourlySales?: { hour: number; averageRevenue: number; daysWithSales: number }[] } | null;
}
export interface WeeklyAiMissionReport { weeks: string[]; selectedWeek: string | null; missions: WeeklyAiMission[] }

export interface PolicyRecord {
  Policy_ID: number | null;
  Gov_Pay_Ratio: string;
  User_Pay_Ratio: string;
  Grant_Amount: string;
  Effective_From?: string;
  Note: string | null;
  users?: { Citizen_ID: string };
}

export interface RewardProvince { id: number; name: string; districtCount: number; requiredStampCount: number }
export interface DistrictStampOverview {
  districtId: number; districtName: string; provinceId: number; provinceName: string;
  stampName: string; issuedCount: number; minSpend: number; rewardCount: number;
}
export interface AdminRewardRecord {
  Reward_ID: number; Reward_Name: string; Description: string | null; Reward_Type: string | null;
  Province_ID: number | null; Required_Stamp_Count: number; Image_URL: string | null;
  Source_URL: string | null; Status: string; provinces: { Prov_Name: string } | null;
}
export interface OtopRewardInput {
  Reward_Name: string; Description: string; Province_ID: number; Image_URL: string;
  Source_URL: string; Reward_Type: 'OTOP_PRODUCT'; Status: string; Required_Stamp_Count: number;
}

export interface AdminMerchantRecord {
  Mch_ID: number; User_ID: number; Shop_Name: string; Owner_Name: string | null; Category: string | null;
  Dist_ID: number; Lat: number | string | null; Lng: number | string | null;
  users: { User_ID: number; Name: string | null; Phone: string; Is_Suspended: boolean };
  districts: { Dist_ID: number; Dist_Name: string; Prov_ID: number; provinces: { Prov_ID: number; Prov_Name: string } };
  income: { totalRevenue: number; monthRevenue: number; transactionCount: number; lastSaleAt: string | null };
}
export interface AdminMerchantInput {
  Shop_Name: string; Owner_Name: string | null; Category: string | null; Dist_ID: number; Lat: number | null; Lng: number | null;
}

export interface AdminUserRecord {
  User_ID: number; Name: string | null; Phone: string; Role: string; Subsidy_Eligible: boolean; Is_Suspended: boolean;
  accountType: 'USER' | 'MERCHANT';
  merchants: { Mch_ID: number; Shop_Name: string; Owner_Name: string | null }[];
}

export const adminService = {
  getUsers: () => api.get<AdminUserRecord[]>('/admin/users'),
  updateUser: (id: number, data: { Password?: string; Pin?: string; Subsidy_Eligible?: boolean; Is_Suspended?: boolean }) =>
    api.patch<Pick<AdminUserRecord, 'User_ID' | 'Subsidy_Eligible' | 'Is_Suspended'>>(`/admin/users/${id}`, data),
  getStamps: () => api.get<DistrictStampOverview[]>('/admin/stamps'),
  setStampRule: (districtId: number, data: { minSpend: number; rewardCount: number }) =>
    api.patch<{ districtId: number; minSpend: number; rewardCount: number }>(`/admin/stamps/districts/${districtId}`, data),
  getMerchants: () => api.get<AdminMerchantRecord[]>('/admin/merchants'),
  updateMerchant: (id: number, data: AdminMerchantInput) => api.patch<Omit<AdminMerchantRecord, 'income'>>(`/admin/merchants/${id}`, data),
  suggestSalesMission: (merchantId: number) => api.post<SalesMissionAnalysis>(`/admin/merchants/${merchantId}/mission-suggestion`),
  suggestDailySalesMission: (provinceId: number) => api.post<DailySalesMissionAnalysis>(`/admin/provinces/${provinceId}/daily-mission-suggestion`),
  getDailyMissionAnalyses: () => api.get<DailyMissionReport>('/admin/daily-mission-analyses'),
  getWeeklyAiMissions: (week?: string) => api.get<WeeklyAiMissionReport>(`/admin/weekly-ai-missions${week ? `?week=${encodeURIComponent(week)}` : ''}`),
  refreshWeeklyAiMissions: () => api.post<{ created: number }>('/admin/weekly-ai-missions/refresh'),
  getAiMissionPolicy: () => api.get<{ dailyStampLimit: number; updatedAt: string | null }>('/admin/ai-mission-policy'),
  setAiMissionPolicy: (dailyStampLimit: number) => api.post<{ dailyStampLimit: number; updatedAt: string }>('/admin/ai-mission-policy', { dailyStampLimit }),
  getMissionHistory: (date?: string, signal?: AbortSignal) => api.get<MissionHistoryReport>(`/admin/mission-history${date ? `?date=${encodeURIComponent(date)}` : ''}`, { signal }),
  getRewards: () => api.get<AdminRewardRecord[]>('/admin/rewards'),
  getRewardProvinces: () => api.get<RewardProvince[]>('/admin/rewards/provinces'),
  createOtopReward: (data: OtopRewardInput) => api.post<AdminRewardRecord>('/admin/rewards', data),
  updateOtopReward: (id: number, data: OtopRewardInput) => api.patch<AdminRewardRecord>(`/admin/rewards/${id}`, data),
  getGeographicDashboard: async (signal?: AbortSignal) => {
    const data = await api.get<GeographicDashboardData>('/admin/dashboard/geography', { signal });
    if (!Array.isArray(data.districts)) throw new Error('Backend ยังไม่ส่งข้อมูลอำเภอ/เขต กรุณารีสตาร์ต backend แล้วโหลดข้อมูลใหม่');
    return data;
  },
  getDashboard: () => api.get<DashboardData>('/admin/dashboard'),

  getGrants: () => api.get<GrantRecord[]>('/admin/grants'),

  allocateGrant: (data: {
    Citizen_ID: string;
    Grant_Name?: string;
    Total_Grant_Amount: number;
  }) => api.post<GrantRecord>('/admin/grants', data),

  // ── Grant Policy ──
  getPolicy: () => api.get<PolicyRecord>('/admin/policy'),

  getPolicyHistory: () => api.get<PolicyRecord[]>('/admin/policy/history'),

  setPolicy: (data: {
    Gov_Pay_Ratio: number;
    Grant_Amount?: number;
    Note?: string;
  }) => api.post<PolicyRecord>('/admin/policy', data),

  updateMission: (missionId: number, data: {
    Mission_Name?: string; Description?: string; Max_Recipients?: number | null;
    Start_DateTime?: string; End_DateTime?: string; Status?: string;
    Daily_Start_Minute?: number; Daily_End_Minute?: number;
  }) => api.patch(`/admin/missions/${missionId}`, data),

  createReward: (rewardData: {
    Dist_ID: number;
    Reward_Name: string;
    Cost_Stamps: number;
    Stock_Qty: number;
  }) => api.post('/admin/rewards', rewardData),

  approveMerchant: (mchId: number) => api.post(`/admin/merchants/${mchId}/approve`),
};
