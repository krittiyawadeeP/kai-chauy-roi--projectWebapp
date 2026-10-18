import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { findProvince } from '../../shared/regions';

type Point = [number, number]; // GeoJSON: longitude, latitude.
type Area = {
  properties: { ADM1_PCODE: string; ADM2_PCODE: string; ADM2_TH: string; ADM2_EN: string };
  geometry: { type: string; coordinates: Point[][] };
};

function inRing([x, y]: Point, ring: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inArea(point: Point, area: Area): boolean {
  return inRing(point, area.geometry.coordinates[0]) && !area.geometry.coordinates.slice(1).some(hole => inRing(point, hole));
}

function randomPoint(area: Area): Point {
  const outline = area.geometry.coordinates[0];
  const minX = Math.min(...outline.map(point => point[0]));
  const maxX = Math.max(...outline.map(point => point[0]));
  const minY = Math.min(...outline.map(point => point[1]));
  const maxY = Math.max(...outline.map(point => point[1]));
  for (let attempt = 0; attempt < 10000; attempt++) {
    const point: Point = [
      Number((minX + Math.random() * (maxX - minX)).toFixed(7)),
      Number((minY + Math.random() * (maxY - minY)).toFixed(7)),
    ];
    if (inArea(point, area)) return point;
  }
  throw new Error(`Cannot sample a point in ${area.properties.ADM2_EN}`);
}

const geometry = JSON.parse(readFileSync(new URL('../../frontend/public/maps/thailand-districts.geojson', import.meta.url), 'utf8')) as { features: Area[] };
const areas = geometry.features.filter(area => area.properties.ADM1_PCODE === 'TH73').sort((a, b) => a.properties.ADM2_PCODE.localeCompare(b.properties.ADM2_PCODE));
assert.equal(areas.length, 7);
// shortcut: this seed accepts the seven local Polygon boundaries; add MultiPolygon support if the source changes.
assert(areas.every(area => area.geometry.type === 'Polygon'));
const square: Point[] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
const hole: Point[] = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]];
const testArea: Area = { ...areas[0], geometry: { type: 'Polygon', coordinates: [square, hole] } };
assert(inArea([2, 2], testArea));
assert(!inArea([5, 5], testArea));
assert(!inArea([20, 20], testArea));

const names = ['ข้าวแกงอิ่มอร่อย', 'กาแฟบ้านสวน', 'ผลไม้สดชุมชน', 'ของชำสุขใจ', 'ขนมไทยหอมหวาน', 'ก๋วยเตี๋ยวริมทาง', 'งานคราฟต์ชุมชน', 'ครัวอิ่มใจ', 'ผักสดจากสวน', 'ซ่อมจักรยานชุมชน'];
const categories = ['อาหารและเครื่องดื่ม', 'อาหารและเครื่องดื่ม', 'ผลไม้/เกษตรแปรรูป', 'ของใช้ทั่วไป', 'อาหารและเครื่องดื่ม', 'อาหารและเครื่องดื่ม', 'หัตถกรรม/ของฝาก', 'อาหารและเครื่องดื่ม', 'ผลไม้/เกษตรแปรรูป', 'บริการชุมชน'];
const shops = names.map((name, index) => {
  const area = areas[index % areas.length];
  const point = randomPoint(area);
  assert(inArea(point, area));
  return {
    area, point, name: `[จำลอง] ${name} ${area.properties.ADM2_TH}`,
    category: categories[index], citizenId: `00000730000${String(index + 1).padStart(2, '0')}`,
    phone: `00073000${String(index + 1).padStart(2, '0')}`,
  };
});
assert.equal(new Set(shops.map(shop => shop.citizenId)).size, 10);
assert.equal(new Set(shops.map(shop => shop.point.join(','))).size, 10);

async function main() {
  if (process.argv.includes('--check')) {
    console.table(shops.map(shop => ({ shop: shop.name, district: shop.area.properties.ADM2_EN, lat: shop.point[1], lng: shop.point[0] })));
    console.log('Validated 10 mock shops inside all 7 Nakhon Pathom district polygons; database unchanged.');
    return;
  }
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async tx => {
      const provinces = await tx.provinces.findMany();
      const province = provinces.find(item => findProvince(item.Prov_Name)?.code === '73')
        ?? await tx.provinces.create({ data: { Prov_Name: 'นครปฐม' } });
      const districts = await tx.districts.findMany({ where: { Prov_ID: province.Prov_ID } });
      const rows = [];
      for (const shop of shops) {
        const { area, point } = shop;
        let district = districts.find(item => [area.properties.ADM2_TH, area.properties.ADM2_EN].some(name => name.toLowerCase() === item.Dist_Name.trim().toLowerCase()));
        if (!district) {
          district = await tx.districts.create({ data: { Prov_ID: province.Prov_ID, Dist_Name: area.properties.ADM2_TH } });
          districts.push(district);
        }
        const existing = await tx.users.findUnique({ where: { Citizen_ID: shop.citizenId }, include: { merchants: true } });
        if (existing) {
          assert.equal(existing.Role, 'MERCHANT', 'Demo identifier belongs to another account; refusing to overwrite.');
          assert.equal(existing.Phone, shop.phone);
          assert.equal(existing.merchants.length, 1);
          assert.equal(existing.merchants[0].Shop_Name, shop.name);
        }
        const merchant = existing ? existing.merchants[0] : (await tx.users.create({
          data: {
            Citizen_ID: shop.citizenId, Phone: shop.phone, Password: randomUUID(), Role: 'MERCHANT', Province_ID: province.Prov_ID,
            merchants: { create: { Shop_Name: shop.name, Category: shop.category, Dist_ID: district.Dist_ID, Lat: point[1], Lng: point[0] } },
          }, include: { merchants: true },
        })).merchants[0];
        assert.equal(merchant.Dist_ID, district.Dist_ID);
        assert(merchant.Lat !== null && merchant.Lng !== null);
        assert(inArea([Number(merchant.Lng), Number(merchant.Lat)], area));
        rows.push({ id: merchant.Mch_ID, shop: merchant.Shop_Name, district: district.Dist_Name, lat: Number(merchant.Lat), lng: Number(merchant.Lng), created: !existing });
      }
      assert.equal(rows.length, 10);
      return rows;
    }, { timeout: 30000 });
    console.table(result);
    console.log(`Created ${result.filter(row => row.created).length} mock shops; ${result.length} verified. Existing shops unchanged.`);
  } finally { await prisma.$disconnect(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
