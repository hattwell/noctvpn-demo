import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:18773' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'npm run preview',
      url: 'http://127.0.0.1:18773/',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `${existsSync(join(process.cwd(), '.venv/bin/python')) ? './.venv/bin/python' : 'python3'} -m uvicorn demo_service.app:app --host 127.0.0.1 --port 18774 --no-access-log`,
      url: 'http://127.0.0.1:18774/v1/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: { DEMO_BOT_TOKEN: '', DEMO_WEBHOOK_SECRET: '', DEMO_BOT_WEBHOOK_ENABLED: '0', DEMO_ALLOW_LOCAL_ORIGIN: '1', DEMO_SQLITE_PATH: join(tmpdir(), `noctvpn-demo-browser-${process.pid}.sqlite3`) },
    },
  ],
});
