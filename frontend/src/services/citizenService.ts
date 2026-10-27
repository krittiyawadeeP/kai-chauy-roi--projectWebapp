import { api } from './api';

export interface StampRule { minSpend: number; rewardCount: number; stampName: string }

export interface MissionFilter {
  prov_id?: number;
  dist_id?: number;
}

export const citizenService = {
  getStampRule: (districtId: number) => api.get<StampRule>(`/districts/${districtId}/stamp-rule`),
  getMissions: (params?: MissionFilter) => {
    const query = new URLSearchParams();
    if (params?.prov_id) query.set('prov_id', String(params.prov_id));
    if (params?.dist_id) query.set('dist_id', String(params.dist_id));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return api.get(`/missions${qs}`);
  },

  getMissionById: (missionId: number) => {
    return api.get(`/missions/${missionId}`);
  },

  completeMission: (missionId: number, data: { Tx_ID: number }) => {
    return api.post(`/missions/${missionId}/complete`, data);
  },

  getStamps: (userId: number) => {
    return api.get(`/user/${userId}/stamps`);
  },

  getRewards: (params?: { dist_id?: number; prov_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.prov_id) query.set('prov_id', String(params.prov_id));
    if (params?.dist_id) query.set('dist_id', String(params.dist_id));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return api.get(`/rewards${qs}`);
  },

  redeemReward: (rewardId: number, data: { Dist_Stamp_ID: number; Quantity?: number }) => {
    return api.post(`/rewards/${rewardId}/redeem`, data);
  },

  getWallet: (userId: number) => {
    return api.get(`/user/${userId}/wallet`);
  },

  getGrant: (userId: number) => {
    return api.get(`/user/${userId}/grant`);
  },

  topupWallet: (amount: number) => {
    return api.post<{ message: string; wallet: { walletId: number; userId: number; balance: number; updatedAt: string } }>('/user/topup', { amount });
  },

  verifyPin: (Pin: string) => {
    return api.post<{ valid: boolean; message: string }>('/user/verify-pin', { Pin });
  },

  setPin: (Pin: string) => {
    return api.post<{ success: boolean; message: string }>('/user/set-pin', { Pin });
  },

  pay: (data: { Merchant_ID: number; Total_Amount: number; District_ID?: number; Pin?: string; Stamp_Count?: number }) => {
    return api.post<{
      transaction: any;
      wallet: { walletId: number; userId: number; balance: number; updatedAt: string };
      grant: { grantId: number; userId: number; totalGrantAmount: number; remainingAmount: number };
      awardedStamp?: any;
      awardedStampCount: number;
    }>('/user/pay', data);
  },

  getMyTransactions: () => {
    return api.get<any[]>('/user/me/transactions');
  },

  getStampsHistory: () => {
    return api.get<any[]>('/users/me/stamps/history');
  },
};
