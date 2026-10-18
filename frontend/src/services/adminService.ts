import { api } from './api';
import type { Region } from '../../../shared/regions';

export interface ProvinceMetrics {
  code: string; name: string; region: Region; registered: boolean;
  totalRevenue: number; govSubsidized: number; userPaid: number; transactionCount: number;
  merchantCount: number; totalAllocated: number; totalRemaining: number;
}
export interface GeographicDashboardData { generatedAt: string; provinces: ProvinceMetrics[] }

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
  getGeographicDashboard: (signal?: AbortSignal) => api.get<GeographicDashboardData>('/admin/dashboard/geography', { signal }),
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
    Min_Spend?: number;
    Quota_Limit?: number;
    Dist_Stamp_ID?: number;
  }) => api.post('/admin/missions', missionData),

  createReward: (rewardData: {
    Dist_ID: number;
    Reward_Name: string;
    Cost_Stamps: number;
    Stock_Qty: number;
  }) => api.post('/admin/rewards', rewardData),

  approveMerchant: (mchId: number) => api.post(`/admin/merchants/${mchId}/approve`),
};
