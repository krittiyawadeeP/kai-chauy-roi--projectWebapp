import { api } from './api';

export interface ApiProvince {
  Prov_ID: number;
  Prov_Name: string;
}

export interface ApiDistrict {
  Dist_ID: number;
  Dist_Name: string;
  Prov_ID: number;
}

export const geoService = {
  getProvinces: () => api.get<ApiProvince[]>('/provinces'),
  getDistricts: (provinceId: number) =>
    api.get<ApiDistrict[]>(`/districts?prov_id=${provinceId}`),
};
