// Read at request time so .env.local and deployment environment variables are loaded first.
export function ollamaChat(body: Record<string, unknown>) {
  const baseUrl = (process.env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const url = new URL(`${baseUrl}/api/chat`);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('OLLAMA_BASE_URL must use HTTP or HTTPS');
  const timeout = Number(process.env.OLLAMA_TIMEOUT_MS || 120_000);
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 2_147_483_647) {
    throw new Error('OLLAMA_TIMEOUT_MS must be a positive integer no greater than 2147483647');
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.OLLAMA_API_KEY) headers.Authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
  return fetch(url.toString(), {
    method: 'POST', headers, signal: AbortSignal.timeout(timeout),
    body: JSON.stringify({ ...body, model: process.env.OLLAMA_MODEL?.trim() || 'qwen3:4b', stream: false, think: false }),
  });
}
