import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_EXPIRED_EVENT, api, authStorage } from './api';

test('an invalid server session clears the saved token and requests a new login', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const saved = new Map<string, string>();
  const browser = new EventTarget();
  let expired = 0;
  browser.addEventListener(AUTH_EXPIRED_EVENT, () => expired++);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  globalThis.fetch = async (_url, options) => {
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer old-token');
    return Response.json({ message: 'Invalid or expired token' }, { status: 401 });
  };
  try {
    authStorage.setToken('old-token');
    await assert.rejects(api.get('/admin/merchants'), /Invalid or expired token/);
    assert.equal(authStorage.getToken(), null);
    assert.equal(expired, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
