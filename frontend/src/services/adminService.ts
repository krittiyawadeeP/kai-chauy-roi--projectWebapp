import { api } from './api';
import type { Region } from '../../../shared/regions';

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
  provinceId: number;
  provinceName: string;
  merchantId: number | null;
  shopName: string | null;
  status: 'PENDING' | 'NO_MERCHANT' | 'INSUFFICIENT_DATA' | 'READY' | 'ERROR';
  message: string | null;
  summary: SalesMissionAnalysis['summary'] | null;
  suggestion: SalesMissionAnalysis['suggestion'] | null;
  mission: { id: number; start: string; end: string; quota: number; status: string } | null;
  updatedAt: string;
}

export interface DailyMissionReport { analysisDate: string; rows: DailyMissionRow[] }

export interface AdminMissionRecord {
  Mission_ID: number;
  Mission_Name: string;
  Description: string | null;
  Max_Recipients: number;
  Start_DateTime: string;
  End_DateTime: string;
  Status: string;
  merchants: { Shop_Name: string };
  user_stamps: unknown[];
}

export interface PolicyRecord {
  Policy_ID: number | null;
  Gov_Pay_Ratio: string;
  User_Pay_Ratio: string;
  Grant_Amount: string;
  Effective_From?: string;
  Note: string | null;
  users?: { Citizen_ID: string };
}

export const adminService = {
  getMerchants: () => api.get<{ Mch_ID: number; Shop_Name: string; Category: string | null; districts?: { Dist_Name: string; Prov_ID: number; provinces?: { Prov_Name: string } } }[]>('/admin/merchants'),
  suggestSalesMission: (merchantId: number) => api.post<SalesMissionAnalysis>(`/admin/merchants/${merchantId}/mission-suggestion`),
  suggestDailySalesMission: (provinceId: number) => api.post<DailySalesMissionAnalysis>(`/admin/provinces/${provinceId}/daily-mission-suggestion`),
  getDailyMissionAnalyses: () => api.get<DailyMissionReport>('/admin/daily-mission-analyses'),
  getMissions: () => api.get<AdminMissionRecord[]>('/admin/missions'),
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

  createMission: (missionData: {
    Target_Merchant_ID: number;
    Mission_Name: string;
    Description: string;
    Max_Recipients: number;
    Start_DateTime: string;
    End_DateTime: string;
    Status: 'ACTIVE';
  }) => api.post('/admin/missions', missionData),

  createReward: (rewardData: {
    Dist_ID: number;
    Reward_Name: string;
    Cost_Stamps: number;
    Stock_Qty: number;
  }) => api.post('/admin/rewards', rewardData),

  approveMerchant: (mchId: number) => api.post(`/admin/merchants/${mchId}/approve`),
};
