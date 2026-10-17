import { api } from './api';

export interface CreateSalePayload {
  User_ID: number;
  Total_Amount: number;
  District_ID: number;
  Notes?: string;
}

export const merchantService = {
  getMerchants: (params?: { prov_id?: number; dist_id?: number; low_sales_only?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.prov_id) query.set('prov_id', String(params.prov_id));
    if (params?.dist_id) query.set('dist_id', String(params.dist_id));
    if (params?.low_sales_only) query.set('low_sales_only', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return api.get(`/merchants${qs}`);
  },

  getMerchantById: (mchId: number) => {
    return api.get(`/merchants/${mchId}`);
  },

  recordSale: (data: CreateSalePayload) => {
    return api.post('/merchants/me/sales', data);
  },

  getSalesSummary: () => {
    return api.get('/merchants/me/sales');
  },

  updateProfile: (data: { Shop_Name?: string; Latitude?: number; Longitude?: number }) => {
    return api.patch('/merchants/me', data);
  },
};
