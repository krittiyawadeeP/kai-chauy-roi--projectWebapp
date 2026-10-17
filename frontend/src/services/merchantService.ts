import { api, authStorage } from './api';

export interface CreateSalePayload {
  User_ID: number;
  Total_Amount: number;
  District_ID: number;
  Notes?: string;
}

export interface ApiMerchant {
  Mch_ID: number;
  User_ID: number;
  Shop_Name: string;
  Category: string | null;
  Lat: number | string | null;
  Lng: number | string | null;
  Dist_ID: number;
  districts?: { Dist_Name: string; Prov_ID: number; provinces?: { Prov_Name: string } };
  users?: { Phone?: string; Role?: string };
}

export interface ApiSale {
  Tx_ID: string | number;
  User_ID: number;
  Merchant_ID: number;
  Total_Amount: number | string;
  User_Paid_Amount: number | string;
  Gov_Subsidized_Amount: number | string;
  Tx_Timestamp: string;
  District_ID: number;
  Status: string;
  users?: { Phone?: string; Citizen_ID?: string };
}

export interface MerchantRegistrationPayload {
  Citizen_ID: string;
  Phone: string;
  Password: string;
  Province_ID: number;
  Shop_Name: string;
  Category: string;
  Dist_ID: number;
}

export interface MerchantRegistrationResponse {
  token: string;
  user: { User_ID: number; Citizen_ID: string; Phone: string; Role: string };
  merchant: ApiMerchant;
}

export const merchantService = {
  registerAccount: async (data: MerchantRegistrationPayload) => {
    const result = await api.post<MerchantRegistrationResponse>('/merchants/register', data);
    if (result.token) authStorage.setToken(result.token);
    return result;
  },

  getMyProfile: () => api.get<ApiMerchant>('/merchants/me'),

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

  getSalesSummary: <T = ApiSale[]>() => {
    return api.get<T>('/merchants/me/sales');
  },

  updateProfile: (data: { Shop_Name?: string; Category?: string; Lat?: number; Lng?: number; Dist_ID?: number }) => {
    return api.patch('/merchants/me', data);
  },

  register: (data: { Shop_Name: string; Category: string; Lat?: number; Lng?: number; Dist_ID: number }) =>
    api.post<ApiMerchant>('/merchants', data),
};
