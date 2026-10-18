import assert from 'node:assert/strict';
import test from 'node:test';
import { api } from './api';
import { adminService } from './adminService';

test('a stale backend response must explain missing districts rather than silently emptying the district selector', async () => {
  const original = api.get;
  try {
    api.get = (async () => ({ provinces: [], merchants: [] })) as typeof api.get;
    await assert.rejects(adminService.getGeographicDashboard(), /รีสตาร์ต backend/);
    const current = { provinces: [], districts: [], merchants: [], generatedAt: '2026-10-18T00:00:00Z' };
    api.get = (async () => current) as typeof api.get;
    assert.equal(await adminService.getGeographicDashboard(), current);
  } finally { api.get = original; }
});
