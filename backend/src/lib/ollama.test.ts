import assert from 'node:assert/strict';
import test from 'node:test';
import { ollamaChat } from './ollama';

test('Ollama uses local defaults and deployment URL, model, token and timeout for remote requests', async t => {
  const keys = ['OLLAMA_BASE_URL', 'OLLAMA_MODEL', 'OLLAMA_API_KEY', 'OLLAMA_TIMEOUT_MS'] as const;
  const saved = keys.map(key => process.env[key]);
  const originalFetch = globalThis.fetch;
  try {
    for (const key of keys) delete process.env[key];
    const timeouts: number[] = [];
    t.mock.method(AbortSignal, 'timeout', (ms: number) => {
      timeouts.push(ms);
      return new AbortController().signal;
    });
    const calls: { url: unknown; options?: RequestInit }[] = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return Response.json({ message: { content: '{}' } });
    };
    await ollamaChat({ format: 'json', messages: [{ role: 'user', content: 'hello' }] });
    assert.equal(calls[0].url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(new Headers(calls[0].options?.headers).has('Authorization'), false);
    assert.equal(JSON.parse(String(calls[0].options?.body)).model, 'qwen3:4b');

    process.env.OLLAMA_BASE_URL = 'https://ai.example.com/ollama///';
    process.env.OLLAMA_MODEL = 'custom-model';
    process.env.OLLAMA_API_KEY = 'proxy-token';
    process.env.OLLAMA_TIMEOUT_MS = '180000';
    await ollamaChat({ format: 'json', messages: [{ role: 'user', content: 'hello' }] });
    assert.equal(calls[1].url, 'https://ai.example.com/ollama/api/chat');
    assert.equal(calls[1].options?.method, 'POST');
    assert.equal(new Headers(calls[1].options?.headers).get('Authorization'), 'Bearer proxy-token');
    assert.deepEqual(JSON.parse(String(calls[1].options?.body)), {
      format: 'json', messages: [{ role: 'user', content: 'hello' }],
      model: 'custom-model', stream: false, think: false,
    });
    assert.deepEqual(timeouts, [120000, 180000]);

    for (const timeout of ['abc', '0', '-1', '1.5', '2147483648']) {
      process.env.OLLAMA_TIMEOUT_MS = timeout;
      assert.throws(() => ollamaChat({}), /OLLAMA_TIMEOUT_MS/);
    }
    process.env.OLLAMA_BASE_URL = 'file:///tmp/ollama';
    assert.throws(() => ollamaChat({}), /OLLAMA_BASE_URL/);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    });
  }
});
