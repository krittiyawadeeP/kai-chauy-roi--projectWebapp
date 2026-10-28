import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createSession, destroySession } from '../lib/auth';
import { verifyPassword } from '../lib/password';
import { verifyPin } from '../lib/pin';
import { prisma } from '../lib/prisma';
import { adminRoutes } from './admin.routes';
import { citizenRoutes } from './citizen.routes';

test('admin resets credentials securely, revokes old sessions, and updates only the buyer eligibility', async () => {
  const original = { find: prisma.users.findUnique, login: prisma.users.findFirst, update: prisma.users.update };
  const account: any = { User_ID: 7, Role: 'USER', Phone: '0812345678', Name: 'ผู้ใช้', Password: 'legacy-password', Pin_Hash: null, Subsidy_Eligible: true, wallets: null, user_grants: [], provinces: null };
  let updates = 0;
  (prisma.users as any).findUnique = async ({ where }: any) => where.User_ID === 7 ? account : where.User_ID === 1 ? { User_ID: 1, Role: 'ADMIN' } : null;
  (prisma.users as any).findFirst = async () => account;
  (prisma.users as any).update = async ({ data, select }: any) => {
    updates++;
    assert.deepEqual(select, { User_ID: true, Subsidy_Eligible: true });
    for (const [key, value] of Object.entries(data)) if (value !== undefined) account[key] = value;
    return { User_ID: account.User_ID, Subsidy_Eligible: account.Subsidy_Eligible };
  };
  const app = express(); app.use(express.json()); app.use('/admin', adminRoutes); app.use(citizenRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const admin = createSession(1, 'ADMIN'); const oldSession = createSession(7, 'USER');
  const tokens = [admin, oldSession];
  const patch = (body: unknown, token: string = admin, id = 7) => fetch(`${base}/admin/users/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  const me = (token: string) => fetch(base + '/user/me', { headers: { Authorization: `Bearer ${token}` } });
  const login = (password: string) => fetch(base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Phone: account.Phone, Password: password }) });
  try {
    assert.equal((await patch({ Password: 'new-password' }, '')).status, 401);
    assert.equal((await patch({ Password: 'new-password' }, oldSession)).status, 403);
    for (const body of [{}, { Password: 'short' }, { Password: null }, { Pin: 123456 }, { Pin: '12345x' }, { Subsidy_Eligible: 'false' }, { Role: 'ADMIN' }, { Province_ID: 1 }]) assert.equal((await patch(body)).status, 400);
    assert.equal((await patch({ Subsidy_Eligible: false }, admin, 1)).status, 404);
    assert.equal((await patch({ Subsidy_Eligible: false }, admin, 999)).status, 404);
    assert.equal(updates, 0);
    assert.equal((await login('legacy-password')).status, 200);
    const saved = await patch({ Password: 'new-password', Pin: '012345' });
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { User_ID: 7, Subsidy_Eligible: true });
    assert(verifyPassword('new-password', account.Password));
    assert(verifyPin('012345', account.Pin_Hash));
    assert.notEqual(account.Password, 'new-password'); assert.notEqual(account.Pin_Hash, '012345');
    assert.equal((await me(oldSession)).status, 401);
    assert.equal((await login('legacy-password')).status, 401);
    const newLogin = await login('new-password'); assert.equal(newLogin.status, 200);
    const loggedIn = await newLogin.json() as any; tokens.push(loggedIn.token);
    assert.equal(loggedIn.user.Password, undefined); assert.equal(loggedIn.user.Pin_Hash, undefined);
    assert.equal((await me(loggedIn.token)).status, 200);
    const passwordHash = account.Password;
    assert.equal((await patch({ Subsidy_Eligible: false })).status, 200);
    assert.equal(account.Subsidy_Eligible, false);
    assert.equal(account.Password, passwordHash);
    assert.equal((await me(loggedIn.token)).status, 200, 'losing purchase eligibility does not prevent login');
    assert.equal((await patch({ Pin: '654321' })).status, 200);
    assert(verifyPin('654321', account.Pin_Hash));
    assert.equal((await me(loggedIn.token)).status, 401);
    assert.equal((await patch({ Subsidy_Eligible: true })).status, 200);
    assert.equal(account.Subsidy_Eligible, true);
  } finally {
    tokens.forEach(destroySession);
    (prisma.users as any).findUnique = original.find;
    (prisma.users as any).findFirst = original.login;
    (prisma.users as any).update = original.update;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
