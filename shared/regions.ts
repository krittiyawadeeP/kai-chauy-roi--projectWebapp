import { PROVINCES } from './geography';

export const REGIONS = {
  North: 'ภาคเหนือ', Northeast: 'ภาคตะวันออกเฉียงเหนือ', Central: 'ภาคกลาง',
  East: 'ภาคตะวันออก', West: 'ภาคตะวันตก', South: 'ภาคใต้', Unmapped: 'ไม่สามารถระบุภาค',
} as const;
export type Region = keyof typeof REGIONS;
export function normalizeProvince(name: string) {
  return name.trim().replace(/^(จังหวัด|จ\.|province\s+)/i, '').replace(/\s+province$/i, '').replace(/[\s._-]/g, '').toLowerCase();
}
export function findProvince(name: string) {
  const value = normalizeProvince(name);
  return PROVINCES.find(p => [p.name, p.nameEn, ...p.aliases].some(alias => normalizeProvince(alias) === value));
}
