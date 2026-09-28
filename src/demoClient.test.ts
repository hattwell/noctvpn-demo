import { expect, test, vi } from 'vitest';
import { beginDemo, getDemo, linkDemo, resetDemo, selectDemoPlan } from './demoClient';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
}

test('a new browser session talks only to the isolated API and never includes user data', async () => {
  const box = storage();
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    if (String(input).endsWith('/session') && init?.method === 'POST') return new Response(JSON.stringify({ token: 'fake-random-session', expiresInSeconds: 86400 }), { status: 201 });
    return new Response(JSON.stringify({ planCode: 'base_1', linked: false, status: 'demo_preview', displayPriceRub: 199 }), { status: 200 });
  });
  const result = await beginDemo(box, fetcher as typeof fetch);
  expect(result.planCode).toBe('base_1');
  expect(box.getItem('noctvpn-demo-session-v1')).toBe('fake-random-session');
  expect(calls).toHaveLength(2);
  expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  expect(calls.every(call => call.url.startsWith('https://noctvpn-demo-api.onrender.com/v1/'))).toBe(true);
  expect(calls[1].init?.headers).toEqual({ Authorization: 'Bearer fake-random-session' });
  expect(JSON.stringify(calls)).not.toMatch(/api\.telegram|noctvpn-private|billing|password|payment/i);
});

test('selected plan and one-time code use bearer; an expired session is removed', async () => {
  const box = storage();
  box.setItem('noctvpn-demo-session-v1', 'fake-random-session');
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    if (String(input).endsWith('/link')) return new Response(JSON.stringify({ command: '/start sample-code-only', expiresInSeconds: 600 }));
    return new Response(JSON.stringify({ planCode: 'base_12', linked: false, status: 'demo_preview', displayPriceRub: 1299 }));
  });
  expect((await selectDemoPlan(box, 'base_12', fetcher as typeof fetch)).planCode).toBe('base_12');
  expect((await linkDemo(box, fetcher as typeof fetch)).command).toBe('/start sample-code-only');
  expect(calls[0].init?.body).toBe(JSON.stringify({ planCode: 'base_12' }));
  const expired = vi.fn(async () => new Response('{}', { status: 401 }));
  await expect(getDemo(box, expired as typeof fetch)).rejects.toThrow('Демо-сеанс истёк');
  expect(box.getItem('noctvpn-demo-session-v1')).toBeNull();
});

test('reset removes the browser token after the isolated service clears the link', async () => {
  const box = storage();
  box.setItem('noctvpn-demo-session-v1', 'fake-random-session');
  const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
  await resetDemo(box, fetcher as typeof fetch);
  expect(box.getItem('noctvpn-demo-session-v1')).toBeNull();
});
