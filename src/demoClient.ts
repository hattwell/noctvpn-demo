// Only the isolated portfolio demo API is contacted. This file has no product API client.
const LOCAL = typeof window !== 'undefined' && ['127.0.0.1', 'localhost'].includes(window.location.hostname);
export const DEMO_API = LOCAL ? 'http://127.0.0.1:18774' : 'https://noctvpn-demo-api.onrender.com';
export const SESSION_KEY = 'noctvpn-demo-session-v1';

type StorageBox = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type DemoSession = { planCode: string; displayPriceRub: number; linked: boolean; status: 'demo_preview'; expiresAt: number };
export type DemoLink = { command: string; expiresInSeconds: number };
export type DemoHealth = { ok: boolean; botReady: boolean; temporary: boolean };

async function request<T>(path: string, box: StorageBox, fetcher: typeof fetch, init: RequestInit = {}, privateAction = true): Promise<T> {
  const token = privateAction ? box.getItem(SESSION_KEY) : null;
  if (privateAction && !token) throw new Error('Демо-сеанс не создан. Откройте кабинет снова.');
  let response: Response;
  const controller = new AbortController();
  const deadline = globalThis.setTimeout(() => controller.abort(), 30_000);
  try {
    response = await fetcher(DEMO_API + path, {
      ...init,
      signal: controller.signal,
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new Error('Демо-сервер просыпается или временно недоступен. Попробуйте ещё раз.');
  } finally {
    globalThis.clearTimeout(deadline);
  }
  if (response.status === 401) {
    box.removeItem(SESSION_KEY);
    throw new Error('Демо-сеанс истёк. Создайте новый пример кабинета.');
  }
  if (!response.ok) throw new Error(`Демо-сервер ответил ${response.status}. Попробуйте позже.`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getDemo(box: StorageBox, fetcher: typeof fetch = fetch): Promise<DemoSession> {
  return request('/v1/session', box, fetcher);
}

export async function beginDemo(box: StorageBox, fetcher: typeof fetch = fetch): Promise<DemoSession> {
  if (!box.getItem(SESSION_KEY)) {
    const created = await request<{ token: string }>('/v1/session', box, fetcher, { method: 'POST' }, false);
    box.setItem(SESSION_KEY, created.token);
  }
  return getDemo(box, fetcher);
}

export async function selectDemoPlan(box: StorageBox, planCode: string, fetcher: typeof fetch = fetch): Promise<DemoSession> {
  return request('/v1/session/plan', box, fetcher, { method: 'PATCH', body: JSON.stringify({ planCode }) });
}

export async function linkDemo(box: StorageBox, fetcher: typeof fetch = fetch): Promise<DemoLink> {
  return request('/v1/session/link', box, fetcher, { method: 'POST' });
}

export async function resetDemo(box: StorageBox, fetcher: typeof fetch = fetch): Promise<void> {
  await request('/v1/session/reset', box, fetcher, { method: 'POST' });
  box.removeItem(SESSION_KEY);
}

export async function getDemoHealth(fetcher: typeof fetch = fetch): Promise<DemoHealth> {
  return request('/v1/health', { getItem: () => null, setItem: () => {}, removeItem: () => {} }, fetcher, {}, false);
}
