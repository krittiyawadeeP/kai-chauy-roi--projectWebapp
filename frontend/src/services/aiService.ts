import { api } from './api';

export const aiService = {
  getAnalysis: () => {
    return api.get('/ai/analysis');
  },

  triggerAnalysis: () => {
    return api.post('/ai/analyze');
  },

  getMerchantTrend: (mchId: number) => {
    return api.get(`/ai/merchants/${mchId}/trend`);
  },
};
