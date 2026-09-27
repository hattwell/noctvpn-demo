import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const origin = 'http://127.0.0.1:18773';
const server = spawn(join(root, 'node_modules/.bin/vite'),
  ['preview', '--host', '127.0.0.1', '--port', '18773', '--strictPort'],
  { cwd: root, stdio: 'ignore' });

let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 40 && server.exitCode === null; attempt++) {
    try { const response = await fetch(origin); if (response.ok) { ready = true; break; } }
    catch { /* Waiting only for our isolated static preview. */ }
    await delay(250);
  }
  if (!ready || server.exitCode !== null) throw new Error('Static preview did not start in isolation');
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const blocked = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { blocked.push(url.hostname); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  await page.goto(origin);
  await page.getByRole('heading', { level: 1, name: 'VPN, который понятно подключать и легко продлевать' }).waitFor();
  await mkdir(join(root, 'screenshots'), { recursive: true });
  await page.screenshot({ path: join(root, 'screenshots/site.png'), animations: 'disabled' });
  await page.getByRole('button', { name: '3 месяца' }).click();
  await page.getByRole('button', { name: 'Открыть демо-кабинет' }).click();
  await expect(page.locator('.public-header')).toBeInViewport();
  await page.screenshot({ path: join(root, 'screenshots/cabinet.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Бот · симуляция' }).click();
  await page.getByRole('button', { name: '/start' }).click();
  await page.getByRole('button', { name: 'Моя подписка' }).click();
  await page.screenshot({ path: join(root, 'screenshots/bot.png'), animations: 'disabled' });
  if (blocked.length) throw new Error(`Capture blocked ${blocked.length} external request(s)`);
  console.log('Captured only the static fictional site, cabinet and bot.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
