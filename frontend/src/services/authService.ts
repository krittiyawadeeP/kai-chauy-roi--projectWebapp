import { api, authStorage } from './api';

export interface LoginPayload {
  identifier?: string;
  Citizen_ID?: string;
  Phone?: string;
  Password: string;
  role?: 'citizen' | 'merchant' | 'admin';
}

export interface RegisterPayload {
  Citizen_ID: string;
  Phone: string;
  Password: string;
  Name?: string;
  Pin?: string;
  Province_ID?: number;
  Dist_ID?: number;
  Role?: 'USER' | 'MERCHANT';
}

export interface MerchantRegisterPayload {
  Shop_Name: string;
  Owner_Name: string;
  Category: string;
  Phone: string;
  Citizen_ID: string;
  Password: string;
  Province_ID: number;
  Dist_ID: number;
  Lat?: number;
  Lng?: number;
  Pin?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    User_ID: number;
    Citizen_ID: string;
    Phone: string;
    Name?: string | null;
    Role: string;
    Province_ID?: number;
    Dist_ID?: number;
    hasPin?: boolean;
    Pin_Hash?: string | null;
  };
  hasPin?: boolean;
  merchant?: any;
  wallet?: any;
  grant?: any;
}

export const authService = {
  login: async (credentials: LoginPayload): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/login', credentials);
    if (res?.token) {
      authStorage.setToken(res.token);
    }
    return res;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/user', payload);
    if (res?.token) {
      authStorage.setToken(res.token);
    }
    return res;
  },

  registerMerchant: async (payload: MerchantRegisterPayload): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/merchants/register', payload);
    if (res?.token) {
      authStorage.setToken(res.token);
    }
    return res;
  },

  logout: (): void => {
    authStorage.removeToken();
  },

  getMe: async () => {
    return api.get<{ User_ID: number; Citizen_ID: string; Phone: string; Role: string }>('/user/me');
  },
};
