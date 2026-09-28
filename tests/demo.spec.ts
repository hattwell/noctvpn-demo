import { expect, test } from '@playwright/test';

// The site can contact only its isolated local demo API; every other host is blocked.
const allowed = new Set(['http://127.0.0.1:18773', 'http://127.0.0.1:18774']);
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    if (!allowed.has(new URL(route.request().url()).origin)) return route.abort('blockedbyclient');
    return route.continue();
  });
});

test('original-style catalog has five public plans and cannot charge or provision', async ({ page }) => {
  const unexpected: string[] = [];
  page.on('request', request => {
    if (!allowed.has(new URL(request.url()).origin)) unexpected.push(new URL(request.url()).hostname);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'VPN, который понятно подключать и легко продлевать' })).toBeVisible();
  await expect(page.getByText('Публичное демо · вымышленные данные · без оплаты и VPN-подключения')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Выберите срок и лимит устройств' })).toBeVisible();
  for (const name of ['Trial', 'Base', 'Base 6', 'Base 12', 'Family']) {
    await expect(page.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
  }
  await expect(page.getByText('1 299 ₽')).toBeVisible();
  await page.getByRole('button', { name: 'Купить Base 12' }).click();
  await expect(page.getByRole('region', { name: 'Оформление тарифа Base 12' })).toBeVisible();
  await page.getByRole('button', { name: 'Оплатить' }).click();
  await expect(page.getByText('В демо нельзя оплатить подписку или подключить VPN.')).toBeVisible();
  await page.getByRole('button', { name: 'Демо-кабинет', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Демо-кабинет' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Base 12' })).toBeVisible();
  await expect(page.getByText('демо · предпросмотр')).toBeVisible();
  await expect(page.getByText(/Действующего VPN-доступа нет/)).toBeVisible();
  expect(unexpected).toEqual([]);
  expect(await page.locator('input, textarea, form, img[src^="http"]').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('cabinet creates an isolated shared preview and reports Telegram availability', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Купить Base 12' }).click();
  await page.getByRole('button', { name: 'Демо-кабинет', exact: true }).first().click();
  await expect(page.getByText('Демо-сеанс синхронизирован')).toBeVisible();
  await expect(page.getByText('Telegram-бот пока не подключён')).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('noctvpn-demo-session-v1'));
  expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  const response = await page.request.get('http://127.0.0.1:18774/v1/session', { headers: { Authorization: `Bearer ${token}` } });
  expect(response.status()).toBe(200);
  expect((await response.json()).planCode).toBe('base_12');
});

test('lost demo API is marked unavailable instead of pretending a plan was activated', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Демо-кабинет', exact: true }).first().click();
  await expect(page.getByText('Демо-сеанс синхронизирован')).toBeVisible();
  await page.route('http://127.0.0.1:18774/v1/session', route => route.abort('blockedbyclient'));
  await page.getByRole('button', { name: 'Обновить статус' }).click();
  await expect(page.getByText(/Демо-сервер просыпается или временно недоступен/)).toBeVisible();
  await expect(page.getByText('Демо-сеанс синхронизирован')).toHaveCount(0);
});

test('trial and setup are honest stubs, not keys or an actual paid checkout', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Получить Trial' }).click();
  await expect(page.getByText('В демо Trial не выдаётся.')).toBeVisible();
  await page.getByRole('button', { name: 'Демо-кабинет', exact: true }).first().click();
  await page.getByRole('button', { name: 'Подключить устройство' }).click();
  await expect(page.getByText('В демо нельзя оплатить подписку или подключить VPN.')).toBeVisible();
  await expect(page.locator('a[href^="vless:"], img, canvas')).toHaveCount(0);
});

test('scripted browser bot remains distinct from Telegram and reflects selected public plan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Купить Base 12' }).click();
  await page.getByRole('button', { name: 'Бот · симуляция' }).click();
  await expect(page.getByText('Сообщения не отправляются в Telegram')).toBeVisible();
  await page.getByRole('button', { name: '/start' }).click();
  await page.getByRole('button', { name: 'Тарифы' }).click();
  await expect(page.getByText(/Trial · Base · Base 6 · Base 12 · Family/)).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).click();
  await page.getByRole('button', { name: 'Моя подписка' }).click();
  await expect(page.getByText(/Base 12.*предпросмотр.*доступа нет/)).toBeVisible();
  await page.getByRole('button', { name: 'Помощь' }).click();
  await page.getByRole('button', { name: 'Попробовать подключить' }).click();
  await expect(page.getByText('В демо оплата и VPN-доступ недоступны.')).toBeInViewport({ ratio: 1 });
  await page.reload();
  await page.getByRole('button', { name: 'Бот · симуляция' }).click();
  await expect(page.getByRole('button', { name: '/start' })).toBeVisible();
});
