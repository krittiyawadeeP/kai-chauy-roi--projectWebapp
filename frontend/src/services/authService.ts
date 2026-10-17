import { api, authStorage } from './api';

export interface LoginPayload {
  Citizen_ID?: string;
  Phone?: string;
  Password: string;
  role?: 'citizen' | 'merchant' | 'admin';
}

export interface RegisterPayload {
  Citizen_ID: string;
  Phone: string;
  Password: string;
  Province_ID?: number;
  Dist_ID?: number;
  Role?: 'USER' | 'MERCHANT';
}

export interface AuthResponse {
  token: string;
  user: {
    User_ID: number;
    Citizen_ID: string;
    Phone: string;
    Role?: string;
    Province_ID?: number;
    Dist_ID?: number;
  };
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

  logout: (): void => {
    authStorage.removeToken();
  },

  getMe: async () => {
    return api.get<{ User_ID: number; Citizen_ID: string; Phone: string; Role: string }>('/user/me');
  },
};
