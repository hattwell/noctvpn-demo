import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const site = 'http://127.0.0.1:18773';
const api = 'http://127.0.0.1:18774';
const python = existsSync(join(root, '.venv/bin/python')) ? join(root, '.venv/bin/python') : 'python3';
const web = spawn(join(root, 'node_modules/.bin/vite'), ['preview', '--host', '127.0.0.1', '--port', '18773', '--strictPort'], { cwd: root, stdio: 'ignore' });
const backend = spawn(python, ['-m', 'uvicorn', 'demo_service.app:app', '--host', '127.0.0.1', '--port', '18774', '--no-access-log'], {
  cwd: root, stdio: 'ignore', env: { ...process.env, DEMO_BOT_TOKEN: '', DEMO_WEBHOOK_SECRET: '', DEMO_BOT_WEBHOOK_ENABLED: '0', DEMO_ALLOW_LOCAL_ORIGIN: '1', DEMO_SQLITE_PATH: join(tmpdir(), `noctvpn-demo-capture-${process.pid}.sqlite3`) },
});

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 60 && child.exitCode === null; attempt++) {
    try { if ((await fetch(url)).ok) return; }
    catch { /* Preview and isolated API are still starting. */ }
    await delay(250);
  }
  throw new Error('Isolated screenshot service did not start');
}

let browser;
try {
  await Promise.all([waitFor(site, web), waitFor(api + '/v1/health', backend)]);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const blocked = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (![site, api].includes(url.origin)) { blocked.push(url.hostname); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  await page.goto(site);
  await expect(page.getByRole('heading', { level: 1, name: 'VPN, который понятно подключать и легко продлевать' })).toBeVisible();
  await mkdir(join(root, 'screenshots'), { recursive: true });
  await page.screenshot({ path: join(root, 'screenshots/site.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Купить Base 12' }).click();
  await page.getByRole('button', { name: 'Демо-кабинет', exact: true }).first().click();
  await expect(page.getByText('Демо-сеанс синхронизирован')).toBeVisible();
  await expect(page.locator('.public-header')).toBeInViewport();
  await page.screenshot({ path: join(root, 'screenshots/cabinet.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Бот · симуляция' }).click();
  await page.getByRole('button', { name: '/start' }).click();
  await page.getByRole('button', { name: 'Моя подписка' }).click();
  await page.screenshot({ path: join(root, 'screenshots/bot.png'), animations: 'disabled' });
  if (blocked.length) throw new Error(`Capture blocked ${blocked.length} external request(s)`);
  console.log('Captured only the isolated demo site, shared cabinet, and simulated browser chat.');
} finally {
  await browser?.close();
  web.kill('SIGTERM');
  backend.kill('SIGTERM');
}
