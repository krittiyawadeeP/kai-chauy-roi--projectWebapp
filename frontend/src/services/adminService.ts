import { api } from './api';

export const adminService = {
  getOverview: () => {
    return api.get('/admin/overview');
  },

  createMission: (missionData: {
    Target_Merchant_ID: number;
    Mission_Name: string;
    Min_Spend?: number;
    Quota_Limit?: number;
    Dist_Stamp_ID?: number;
  }) => {
    return api.post('/admin/missions', missionData);
  },

  createReward: (rewardData: {
    Dist_ID: number;
    Reward_Name: string;
    Cost_Stamps: number;
    Stock_Qty: number;
  }) => {
    return api.post('/admin/rewards', rewardData);
  },

  approveMerchant: (mchId: number) => {
    return api.post(`/admin/merchants/${mchId}/approve`);
  },
};
