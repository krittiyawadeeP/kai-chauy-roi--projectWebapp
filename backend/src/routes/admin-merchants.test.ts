import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createSession, destroySession } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { bangkokDate } from '../lib/sales-mission';
import { adminRoutes } from './admin.routes';

test('admin merchant registry shows safe owner details and completed-sale income, and validates profile edits', async (t) => {
  const authFind = prisma.users.findUnique;
  (prisma.users as any).findUnique = async () => ({ Is_Suspended: false });
  t.after(() => { (prisma.users as any).findUnique = authFind; });
  const original = {
    list: prisma.merchants.findMany, find: prisma.merchants.findUnique, update: prisma.merchants.update,
    district: prisma.districts.findUnique, sales: prisma.sales_transactions.groupBy,
  };
  const district = (id: number) => ({ Dist_ID: id, Dist_Name: id === 1 ? 'เมือง' : 'สามพราน', Prov_ID: 73, provinces: { Prov_ID: 73, Prov_Name: 'นครปฐม' } });
  const shop: any = { Mch_ID: 1, User_ID: 11, Shop_Name: 'ร้านเดิม', Owner_Name: 'เจ้าของเดิม', Category: 'FOOD_DRINK', Dist_ID: 1, Lat: 13, Lng: 100,
    users: { User_ID: 11, Name: 'ชื่อบัญชี', Phone: '0812345678', Password: 'secret', Pin_Hash: 'secret' }, districts: district(1) };
  let updates = 0;
  (prisma.merchants as any).findMany = async (query: any) => {
    assert.deepEqual(query.include.users.select, { User_ID: true, Name: true, Phone: true, Is_Suspended: true });
    return [shop, { ...shop, Mch_ID: 2 }];
  };
  (prisma.sales_transactions as any).groupBy = async (query: any) => {
    assert.deepEqual(query.by, ['Merchant_ID']);
    assert.deepEqual(query.where.Status.in, ['COMPLETED', 'completed']);
    assert(query.where.Tx_Timestamp.lt instanceof Date, 'future transactions must be excluded');
    if (query.where.Tx_Timestamp.gte) {
      const monthStart = new Date(`${bangkokDate(query.where.Tx_Timestamp.lt).slice(0, 7)}-01T00:00:00+07:00`);
      assert.equal(query.where.Tx_Timestamp.gte.toISOString(), monthStart.toISOString());
      return [{ Merchant_ID: 1, _sum: { Total_Amount: '300.25' } }];
    }
    return [{ Merchant_ID: 1, _sum: { Total_Amount: '1200.50' }, _count: { _all: 4 }, _max: { Tx_Timestamp: new Date('2026-10-26T05:00:00Z') } }];
  };
  (prisma.merchants as any).findUnique = async ({ where }: any) => where.Mch_ID === 1 ? { Mch_ID: 1 } : null;
  (prisma.districts as any).findUnique = async ({ where }: any) => [1, 2].includes(where.Dist_ID) ? district(where.Dist_ID) : null;
  (prisma.merchants as any).update = async ({ data }: any) => {
    updates++;
    assert(!Object.hasOwn(data, 'User_ID'));
    for (const [key, value] of Object.entries(data)) if (value !== undefined) shop[key] = value;
    shop.districts = district(shop.Dist_ID);
    return shop;
  };
  const app = express(); app.use(express.json()); app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/admin/merchants`;
  const admin = createSession(1, 'ADMIN'); const citizen = createSession(2, 'USER');
  const headers = { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' };
  const patch = (body: unknown, id = '1') => fetch(`${url}/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${citizen}` } })).status, 403);
    assert.equal((await fetch(url + '/1', { method: 'PATCH', headers: { Authorization: `Bearer ${citizen}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ Shop_Name: 'ชื่อใหม่' }) })).status, 403);
    const response = await fetch(url, { headers });
    assert.equal(response.status, 200);
    const rows = await response.json() as any[];
    assert.equal(rows[0].users.Name, 'ชื่อบัญชี');
    assert.equal(rows[0].users.Password, undefined);
    assert.equal(rows[0].users.Pin_Hash, undefined);
    assert.deepEqual(rows[0].income, { totalRevenue: 1200.5, monthRevenue: 300.25, transactionCount: 4, lastSaleAt: '2026-10-26T05:00:00.000Z' });
    assert.deepEqual(rows[1].income, { totalRevenue: 0, monthRevenue: 0, transactionCount: 0, lastSaleAt: null });
    for (const body of [{}, { Shop_Name: ' ' }, { Owner_Name: 123 }, { Category: 'invalid' }, { Dist_ID: 999 }, { Dist_ID: '1' }, { Lat: 91 }, { Lng: -181 }, { User_ID: 99 }]) {
      assert.equal((await patch(body)).status, 400);
    }
    assert.equal((await patch({ Shop_Name: 'ชื่อใหม่' }, 'bad')).status, 400);
    assert.equal((await patch({ Shop_Name: 'ชื่อใหม่' }, '999')).status, 404);
    assert.equal(updates, 0);
    const savedResponse = await patch({ Shop_Name: ' ร้านใหม่ ', Owner_Name: ' เจ้าของใหม่ ', Category: 'อาหารและเครื่องดื่ม', Dist_ID: 2, Lat: 13.7, Lng: 100.2 });
    assert.equal(savedResponse.status, 200);
    const saved = await savedResponse.json() as any;
    assert.equal(saved.Shop_Name, 'ร้านใหม่');
    assert.equal(saved.Owner_Name, 'เจ้าของใหม่');
    assert.equal(saved.Category, 'อาหารและเครื่องดื่ม');
    assert.equal(saved.districts.Dist_Name, 'สามพราน');
    assert.equal(saved.User_ID, 11);
    assert.equal((await patch({ Lat: null, Lng: null })).status, 200);
    assert.equal(shop.Lat, null); assert.equal(shop.Lng, null);
    assert.equal(shop.Owner_Name, 'เจ้าของใหม่');
  } finally {
    destroySession(admin); destroySession(citizen);
    (prisma.merchants as any).findMany = original.list;
    (prisma.merchants as any).findUnique = original.find;
    (prisma.merchants as any).update = original.update;
    (prisma.districts as any).findUnique = original.district;
    (prisma.sales_transactions as any).groupBy = original.sales;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
