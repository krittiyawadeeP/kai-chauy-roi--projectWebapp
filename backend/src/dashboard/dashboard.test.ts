import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildGeographicDashboard, buildMerchantLocations } from './geographic-dashboard';
import { findProvince } from '../../../shared/regions';
import { PROVINCES } from '../../../shared/geography';
import { DISTRICTS } from '../../../shared/districts';

test('province reference has 77 unique codes and resolves Thai/English database names', () => {
  assert.equal(PROVINCES.length, 77);
  assert.equal(new Set(PROVINCES.map(p => p.code)).size, 77);
  assert.equal(findProvince('Bangkok')?.code, '10');
  assert.equal(findProvince('จังหวัดเชียงใหม่')?.region, 'North');
  assert.equal(findProvince('Chiang Mai Province')?.code, '50');
  assert.equal(findProvince('unknown'), undefined);
  const boundaries = JSON.parse(readFileSync(new URL('../../../frontend/public/maps/thailand-provinces.geojson', import.meta.url), 'utf8'));
  assert.equal(boundaries.features.length, 77);
  const codes = new Set(boundaries.features.map((feature: any) => feature.properties.ADM1_PCODE.replace('TH', '')));
  assert.ok(PROVINCES.every(province => codes.has(province.code)), 'every reference province has a matching map boundary');
  const districtMap = JSON.parse(readFileSync(new URL('../../../frontend/public/maps/thailand-districts.geojson', import.meta.url), 'utf8'));
  const districtCodes = new Set(districtMap.features.map((feature: any) => feature.properties.ADM2_PCODE.replace('TH', '')));
  assert.equal(DISTRICTS.length, 928);
  assert.equal(districtCodes.size, DISTRICTS.length);
  assert.ok(DISTRICTS.every(district => districtCodes.has(district.code)));
  assert.ok(districtMap.features.every((feature: any) => DISTRICTS.some(district => `TH${district.code}` === feature.properties.ADM2_PCODE && `TH${district.provinceCode}` === feature.properties.ADM1_PCODE)));
});

test('transactions without a matching district remain visible at both geographic levels', () => {
  const result = buildGeographicDashboard([], [{ District_ID: 9999, _sum: { Total_Amount: '10.01', Gov_Subsidized_Amount: 4, User_Paid_Amount: '6.01' }, _count: { Tx_ID: 1 } }], [], []);
  assert.equal(result.provinces.find(p => p.code === 'unassigned')?.totalRevenue, 10.01);
  const district = result.districts.find(d => d.code === 'db-9999')!;
  assert.equal(district.totalRevenue, 10.01);
  assert.equal(district.provinceCode, 'unassigned');
});

test('geographic totals join actual database IDs, preserve money and keep unmapped amounts visible', () => {
  const { provinces: result, districts } = buildGeographicDashboard([
    { Prov_ID: 1, Prov_Name: 'Bangkok', districts: [{ Dist_ID: 99, Dist_Name: 'เขตพระนคร', _count: { merchants: 2 } }] },
    { Prov_ID: 2, Prov_Name: 'เชียงใหม่', districts: [{ Dist_ID: 100, Dist_Name: 'Mueang Chiang Mai', _count: { merchants: 1 } }] },
    { Prov_ID: 3, Prov_Name: 'พื้นที่เก่า', districts: [{ Dist_ID: 101, Dist_Name: 'อำเภอเดิม', _count: { merchants: 1 } }] },
  ], [
    { District_ID: 99, _sum: { Total_Amount: '100.01', Gov_Subsidized_Amount: '40.00', Stamp_Paid_Amount: '10.00', User_Paid_Amount: '50.01' }, _count: { Tx_ID: 1 } },
    { District_ID: 100, _sum: { Total_Amount: '250.00', Gov_Subsidized_Amount: '100.00', User_Paid_Amount: '150.00' }, _count: { Tx_ID: 2 } },
    { District_ID: 101, _sum: { Total_Amount: 10, Gov_Subsidized_Amount: 4, User_Paid_Amount: 6 }, _count: { Tx_ID: 1 } },
  ], [{ User_ID: 10, _sum: { Total_Grant_Amount: 1000, Remaining_Amount: 600 } }, { User_ID: 11, _sum: { Total_Grant_Amount: 1000, Remaining_Amount: 900 } }], [{ User_ID: 10, Province_ID: 1 }, { User_ID: 11, Province_ID: null }]);
  const bangkok = result.find(p => p.code === '10')!;
  assert.equal(bangkok.totalRevenue, 100.01);
  assert.equal(bangkok.stampPaid, 10);
  assert.equal(bangkok.govPaidTotal, 50);
  assert.equal(bangkok.totalAllocated, 1000);
  assert.equal(bangkok.totalRemaining, 600);
  assert.equal(bangkok.merchantCount, 2);
  assert.equal(result.find(p => p.code === '50')?.transactionCount, 2);
  assert.equal(result.find(p => p.code === 'db-3')?.region, 'Unmapped');
  assert.equal(result.find(p => p.code === 'unassigned')?.totalAllocated, 1000);
  assert.equal(Math.round(result.reduce((sum, p) => sum + p.totalRevenue, 0) * 100), 36001);
  assert.equal(result.find(p => p.code === '83')?.totalRevenue, 0);
  assert.equal(result.find(p => p.code === '83')?.registered, false);
  assert.equal(result.reduce((sum, p) => sum + p.merchantCount, 0), 4);
  const phraNakhon = districts.find(d => d.code === '1001')!;
  assert.equal(phraNakhon.totalRevenue, 100.01);
  assert.equal(phraNakhon.merchantCount, 2);
  assert.equal(phraNakhon.provinceCode, '10');
  assert.equal('totalAllocated' in phraNakhon, false, 'province grant balances must not be allocated to districts');
  assert.equal(districts.find(d => d.code === '5001')?.totalRevenue, 250);
  assert.equal(districts.find(d => d.code === '1002')?.registered, false);
  assert.equal(districts.find(d => d.code === 'db-101')?.provinceCode, 'db-3');
  assert.equal(districts.reduce((sum, d) => sum + d.merchantCount, 0), 4);
  assert.equal(Math.round(districts.reduce((sum, d) => sum + d.totalRevenue, 0) * 100), 36001);
});

test('merchant pins use actual coordinates and province identity, excluding missing or invalid coordinates', () => {
  const merchant = { Mch_ID: 1, Shop_Name: 'ร้านชุมชน', Category: 'อาหาร', Lat: '13.7563', Lng: '100.5018', districts: { Dist_ID: 99, Dist_Name: 'เขตพระนคร', provinces: { Prov_ID: 99, Prov_Name: 'Bangkok' } } };
  const locations = buildMerchantLocations([
    merchant,
    { ...merchant, Mch_ID: 2, Lat: null },
    { ...merchant, Mch_ID: 3, Lng: null },
    { ...merchant, Mch_ID: 4, Lat: NaN },
    { ...merchant, Mch_ID: 5, Lat: '91' },
    { ...merchant, Mch_ID: 6, Lng: '181' },
    { ...merchant, Mch_ID: 7, Lat: -91 },
    { ...merchant, Mch_ID: 8, Lng: -181 },
    { ...merchant, Mch_ID: 9, Lat: 0, Lng: 0, districts: { ...merchant.districts, provinces: { Prov_ID: 3, Prov_Name: 'พื้นที่เดิม' } } },
  ]);
  assert.equal(locations.length, 2);
  assert.deepEqual(locations[0], { merchantId: 1, shopName: 'ร้านชุมชน', category: 'อาหาร', lat: 13.7563, lng: 100.5018, provinceCode: '10', provinceName: 'กรุงเทพมหานคร', districtName: 'เขตพระนคร', districtCode: '1001', region: 'Central' });
  assert.equal(locations[1].provinceCode, 'db-3');
  assert.equal(locations[1].region, 'Unmapped');
  assert.equal(locations[1].districtCode, 'db-99');
  assert.equal(locations[1].lat, 0);
});
