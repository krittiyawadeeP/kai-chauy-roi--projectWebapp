export function requiredDistrictStamps(districtCount: number) {
  return Math.ceil(districtCount * 0.8);
}

export function collectedDistrictCount(stamps: { district_stamps: { District_ID: number; districts: { Prov_ID: number } } }[], provinceId: number) {
  return new Set(stamps.filter(stamp => stamp.district_stamps.districts.Prov_ID === provinceId)
    .map(stamp => stamp.district_stamps.District_ID)).size;
}
