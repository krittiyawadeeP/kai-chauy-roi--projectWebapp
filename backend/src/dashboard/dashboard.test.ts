import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildGeographicDashboard } from './geographic-dashboard';
import { findProvince } from '../../../shared/regions';
import { PROVINCES } from '../../../shared/geography';

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
});

test('geographic totals join actual database IDs, preserve money and keep unmapped amounts visible', () => {
  const result = buildGeographicDashboard([
    { Prov_ID: 1, Prov_Name: 'Bangkok', districts: [{ Dist_ID: 99, _count: { merchants: 2 } }] },
    { Prov_ID: 2, Prov_Name: 'เชียงใหม่', districts: [{ Dist_ID: 100, _count: { merchants: 1 } }] },
    { Prov_ID: 3, Prov_Name: 'พื้นที่เก่า', districts: [{ Dist_ID: 101, _count: { merchants: 1 } }] },
  ], [
    { District_ID: 99, _sum: { Total_Amount: '100.01', Gov_Subsidized_Amount: '40.00', User_Paid_Amount: '60.01' }, _count: { Tx_ID: 1 } },
    { District_ID: 100, _sum: { Total_Amount: '250.00', Gov_Subsidized_Amount: '100.00', User_Paid_Amount: '150.00' }, _count: { Tx_ID: 2 } },
    { District_ID: 101, _sum: { Total_Amount: 10, Gov_Subsidized_Amount: 4, User_Paid_Amount: 6 }, _count: { Tx_ID: 1 } },
  ], [{ User_ID: 10, _sum: { Total_Grant_Amount: 1000, Remaining_Amount: 600 } }, { User_ID: 11, _sum: { Total_Grant_Amount: 1000, Remaining_Amount: 900 } }], [{ User_ID: 10, Province_ID: 1 }, { User_ID: 11, Province_ID: null }]);
  const bangkok = result.find(p => p.code === '10')!;
  assert.equal(bangkok.totalRevenue, 100.01);
  assert.equal(bangkok.totalAllocated, 1000);
  assert.equal(bangkok.totalRemaining, 600);
  assert.equal(bangkok.merchantCount, 2);
  assert.equal(result.find(p => p.code === '50')?.transactionCount, 2);
  assert.equal(result.find(p => p.code === 'db-3')?.region, 'Unmapped');
  assert.equal(result.find(p => p.code === 'unassigned')?.totalAllocated, 1000);
  assert.equal(Math.round(result.reduce((sum, p) => sum + p.totalRevenue, 0) * 100), 36001);
  assert.equal(result.find(p => p.code === '83')?.totalRevenue, 0);
  assert.equal(result.find(p => p.code === '83')?.registered, false);
});
