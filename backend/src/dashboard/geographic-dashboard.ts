import { PROVINCES } from '../../../shared/geography';
import { DISTRICTS } from '../../../shared/districts';
import { findProvince, type Region } from '../../../shared/regions';

export type AreaMetrics = {
  code: string; name: string; region: Region; registered: boolean;
  totalRevenue: number; govSubsidized: number; stampPaid: number; govPaidTotal: number; userPaid: number; transactionCount: number;
  merchantCount: number; totalAllocated: number; totalRemaining: number;
};
export type DistrictMetrics = Pick<AreaMetrics, 'code' | 'name' | 'region' | 'registered' | 'totalRevenue' | 'govSubsidized' | 'stampPaid' | 'govPaidTotal' | 'userPaid' | 'transactionCount' | 'merchantCount'> & { provinceCode: string; provinceName: string };
type ProvinceInput = { Prov_ID: number; Prov_Name: string; districts: { Dist_ID: number; Dist_Name: string; _count: { merchants: number } }[] };
type TransactionInput = { District_ID: number; _sum: { Total_Amount: unknown; Gov_Subsidized_Amount: unknown; Stamp_Paid_Amount?: unknown; User_Paid_Amount: unknown }; _count: { Tx_ID: number } };
type GrantInput = { User_ID: number; _sum: { Total_Grant_Amount: unknown; Remaining_Amount: unknown } };
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100);
const normalizeDistrict = (name: string) => name.trim().replace(/^(อำเภอ|เขต|อ\.|amphoe\s+|khet\s+)/i, '').replace(/\s+district$/i, '').replace(/[\s._-]/g, '').toLowerCase();
function districtCode(id: number, name: string, provinceCode: string) {
  const normalized = normalizeDistrict(name);
  return DISTRICTS.find(district => district.provinceCode === provinceCode && [district.name, district.nameEn].some(alias => normalizeDistrict(alias) === normalized))?.code ?? `db-${id}`;
}

type MerchantInput = {
  Mch_ID: number; Shop_Name: string; Category: string | null; Lat: unknown; Lng: unknown;
  districts: { Dist_ID: number; Dist_Name: string; provinces: { Prov_ID: number; Prov_Name: string } };
};

export function buildMerchantLocations(merchants: MerchantInput[]) {
  return merchants.flatMap(merchant => {
    if (merchant.Lat == null || merchant.Lng == null) return [];
    const lat = Number(merchant.Lat);
    const lng = Number(merchant.Lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return [];
    const province = merchant.districts.provinces;
    const match = findProvince(province.Prov_Name);
    return [{
      merchantId: merchant.Mch_ID, shopName: merchant.Shop_Name, category: merchant.Category,
      lat, lng, provinceCode: match?.code ?? `db-${province.Prov_ID}`,
      provinceName: match?.name ?? province.Prov_Name, districtName: merchant.districts.Dist_Name,
      districtCode: districtCode(merchant.districts.Dist_ID, merchant.districts.Dist_Name, match?.code ?? `db-${province.Prov_ID}`),
      region: match?.region ?? 'Unmapped',
    }];
  });
}

export function buildGeographicDashboard(provinces: ProvinceInput[], transactions: TransactionInput[], grants: GrantInput[], users: { User_ID: number; Province_ID: number | null }[]) {
  const blank = (code: string, name: string, region: Region): AreaMetrics => ({ code, name, region, registered: false, totalRevenue: 0, govSubsidized: 0, stampPaid: 0, govPaidTotal: 0, userPaid: 0, transactionCount: 0, merchantCount: 0, totalAllocated: 0, totalRemaining: 0 });
  const areas: AreaMetrics[] = PROVINCES.map(p => blank(p.code, p.name, p.region));
  const byProvinceId = new Map<number, AreaMetrics>();
  const byDistrictId = new Map<number, AreaMetrics>();
  const districts: DistrictMetrics[] = DISTRICTS.map(district => {
    const province = PROVINCES.find(p => p.code === district.provinceCode)!;
    return { code: district.code, name: district.name, provinceCode: province.code, provinceName: province.name, region: province.region, registered: false, totalRevenue: 0, govSubsidized: 0, stampPaid: 0, govPaidTotal: 0, userPaid: 0, transactionCount: 0, merchantCount: 0 };
  });
  const districtById = new Map<number, DistrictMetrics>();
  const unassigned = blank('unassigned', 'ไม่ระบุจังหวัด', 'Unmapped');
  for (const province of provinces) {
    const match = findProvince(province.Prov_Name);
    let area = areas.find(p => p.code === match?.code);
    if (!area) { area = blank(`db-${province.Prov_ID}`, province.Prov_Name, 'Unmapped'); areas.push(area); }
    area.registered = true;
    byProvinceId.set(province.Prov_ID, area);
    for (const district of province.districts) {
      byDistrictId.set(district.Dist_ID, area);
      area.merchantCount += district._count.merchants;
      const code = districtCode(district.Dist_ID, district.Dist_Name, area.code);
      let districtArea = districts.find(d => d.code === code);
      if (!districtArea) {
        districtArea = { code, name: district.Dist_Name, provinceCode: area.code, provinceName: area.name, region: area.region, registered: true, totalRevenue: 0, govSubsidized: 0, stampPaid: 0, govPaidTotal: 0, userPaid: 0, transactionCount: 0, merchantCount: 0 };
        districts.push(districtArea);
      }
      districtArea.registered = true;
      districtArea.merchantCount += district._count.merchants;
      districtById.set(district.Dist_ID, districtArea);
    }
  }
  for (const tx of transactions) {
    const area = byDistrictId.get(tx.District_ID) ?? unassigned;
    area.totalRevenue += cents(tx._sum.Total_Amount);
    area.govSubsidized += cents(tx._sum.Gov_Subsidized_Amount);
    area.stampPaid += cents(tx._sum.Stamp_Paid_Amount);
    area.govPaidTotal += cents(tx._sum.Gov_Subsidized_Amount) + cents(tx._sum.Stamp_Paid_Amount);
    area.userPaid += cents(tx._sum.User_Paid_Amount);
    area.transactionCount += tx._count.Tx_ID;
    let district = districtById.get(tx.District_ID);
    if (!district) {
      district = { code: `db-${tx.District_ID}`, name: `ไม่ระบุอำเภอ/เขต (#${tx.District_ID})`, provinceCode: area.code, provinceName: area.name, region: area.region, registered: false, totalRevenue: 0, govSubsidized: 0, stampPaid: 0, govPaidTotal: 0, userPaid: 0, transactionCount: 0, merchantCount: 0 };
      districts.push(district);
      districtById.set(tx.District_ID, district);
    }
    district.totalRevenue += cents(tx._sum.Total_Amount);
    district.govSubsidized += cents(tx._sum.Gov_Subsidized_Amount);
    district.stampPaid += cents(tx._sum.Stamp_Paid_Amount);
    district.govPaidTotal += cents(tx._sum.Gov_Subsidized_Amount) + cents(tx._sum.Stamp_Paid_Amount);
    district.userPaid += cents(tx._sum.User_Paid_Amount);
    district.transactionCount += tx._count.Tx_ID;
  }
  const userProvinces = new Map(users.map(user => [user.User_ID, user.Province_ID]));
  for (const grant of grants) {
    const provinceId = userProvinces.get(grant.User_ID);
    const area = provinceId == null ? unassigned : byProvinceId.get(provinceId) ?? unassigned;
    area.totalAllocated += cents(grant._sum.Total_Grant_Amount);
    area.totalRemaining += cents(grant._sum.Remaining_Amount);
  }
  if (unassigned.totalAllocated || unassigned.transactionCount) areas.push(unassigned);
  return {
    provinces: areas.map(area => ({ ...area, totalRevenue: area.totalRevenue / 100, govSubsidized: area.govSubsidized / 100, stampPaid: area.stampPaid / 100, govPaidTotal: area.govPaidTotal / 100, userPaid: area.userPaid / 100, totalAllocated: area.totalAllocated / 100, totalRemaining: area.totalRemaining / 100 })),
    districts: districts.map(district => ({ ...district, totalRevenue: district.totalRevenue / 100, govSubsidized: district.govSubsidized / 100, stampPaid: district.stampPaid / 100, govPaidTotal: district.govPaidTotal / 100, userPaid: district.userPaid / 100 })),
  };
}
