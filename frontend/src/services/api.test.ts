import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_EXPIRED_EVENT, ApiError, api, authStorage } from './api';

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

test('reads recover from backend restarts with bounded retries while writes and cancellations are not replayed', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
  try {
    for (const failure of [502, 503, 504, new TypeError('Failed to fetch')]) {
      let calls = 0;
      globalThis.fetch = async () => {
        if (++calls === 1) {
          if (failure instanceof Error) throw failure;
          return new Response('', { status: failure });
        }
        return Response.json({ ready: true });
      };
      assert.deepEqual(await api.get('/admin/dashboard/geography'), { ready: true });
      assert.equal(calls, 2);
    }

    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response('', { status: 502 }); };
    await assert.rejects(api.get('/policy'), (error: unknown) => error instanceof ApiError && error.status === 502);
    assert.equal(calls, 3);

    calls = 0;
    await assert.rejects(api.post('/login', {}), (error: unknown) => error instanceof ApiError && error.status === 502);
    assert.equal(calls, 1);

    const controller = new AbortController();
    calls = 0;
    globalThis.fetch = async () => { calls++; controller.abort(); throw new TypeError('Failed to fetch'); };
    await assert.rejects(api.get('/policy', { signal: controller.signal }), /Failed to fetch/);
    assert.equal(calls, 1);

    calls = 0;
    await assert.rejects(api.get('/policy', { signal: AbortSignal.abort() }), { name: 'AbortError' });
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
