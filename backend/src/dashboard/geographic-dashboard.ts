import { PROVINCES } from '../../../shared/geography';
import { findProvince, type Region } from '../../../shared/regions';

export type AreaMetrics = {
  code: string; name: string; region: Region; registered: boolean;
  totalRevenue: number; govSubsidized: number; userPaid: number; transactionCount: number;
  merchantCount: number; totalAllocated: number; totalRemaining: number;
};
type ProvinceInput = { Prov_ID: number; Prov_Name: string; districts: { Dist_ID: number; _count: { merchants: number } }[] };
type TransactionInput = { District_ID: number; _sum: { Total_Amount: unknown; Gov_Subsidized_Amount: unknown; User_Paid_Amount: unknown }; _count: { Tx_ID: number } };
type GrantInput = { User_ID: number; _sum: { Total_Grant_Amount: unknown; Remaining_Amount: unknown } };
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100);

export function buildGeographicDashboard(provinces: ProvinceInput[], transactions: TransactionInput[], grants: GrantInput[], users: { User_ID: number; Province_ID: number | null }[]) {
  const blank = (code: string, name: string, region: Region): AreaMetrics => ({ code, name, region, registered: false, totalRevenue: 0, govSubsidized: 0, userPaid: 0, transactionCount: 0, merchantCount: 0, totalAllocated: 0, totalRemaining: 0 });
  const areas: AreaMetrics[] = PROVINCES.map(p => blank(p.code, p.name, p.region));
  const byProvinceId = new Map<number, AreaMetrics>();
  const byDistrictId = new Map<number, AreaMetrics>();
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
    }
  }
  for (const tx of transactions) {
    const area = byDistrictId.get(tx.District_ID) ?? unassigned;
    area.totalRevenue += cents(tx._sum.Total_Amount);
    area.govSubsidized += cents(tx._sum.Gov_Subsidized_Amount);
    area.userPaid += cents(tx._sum.User_Paid_Amount);
    area.transactionCount += tx._count.Tx_ID;
  }
  const userProvinces = new Map(users.map(user => [user.User_ID, user.Province_ID]));
  for (const grant of grants) {
    const provinceId = userProvinces.get(grant.User_ID);
    const area = provinceId == null ? unassigned : byProvinceId.get(provinceId) ?? unassigned;
    area.totalAllocated += cents(grant._sum.Total_Grant_Amount);
    area.totalRemaining += cents(grant._sum.Remaining_Amount);
  }
  if (unassigned.totalAllocated || unassigned.transactionCount) areas.push(unassigned);
  return areas.map(area => ({ ...area, totalRevenue: area.totalRevenue / 100, govSubsidized: area.govSubsidized / 100, userPaid: area.userPaid / 100, totalAllocated: area.totalAllocated / 100, totalRemaining: area.totalRemaining / 100 }));
}
