import { expect, test } from '@playwright/test';

// Even an accidental external request is blocked before it reaches the network.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:18773') {
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
});

test('site: fictional plans and cabinet preserve the real-site hierarchy without payment', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:18773/')) external.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'VPN, который понятно подключать и легко продлевать' })).toBeVisible();
  await expect(page.getByText('Публичное демо · вымышленные данные · без оплаты и VPN-подключения')).toBeVisible();
  await page.getByRole('button', { name: 'Посмотреть тарифы' }).click();
  await expect(page.getByRole('heading', { name: 'Выберите пример тарифа' })).toBeVisible();
  await page.getByRole('button', { name: 'Выбрать Горизонт' }).click();
  await page.getByRole('button', { name: '3 месяца' }).click();
  await expect(page.getByText('630 демо-ед.')).toBeVisible();
  await page.getByRole('button', { name: 'Открыть демо-кабинет' }).click();
  await expect(page.getByRole('heading', { name: 'Демо-кабинет' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Горизонт' })).toBeVisible();
  await expect(page.getByText('37 из 100 условных ГБ')).toBeVisible();
  await expect(page.getByText('Создана демо-подписка')).toBeVisible();
  await page.getByRole('button', { name: 'Вернуться к тарифам' }).click();
  await expect(page.getByRole('heading', { name: 'Выберите пример тарифа' })).toBeVisible();
  expect(external).toEqual([]);
  expect(await page.locator('input, textarea, a[href^="http"], img[src^="http"]').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('navigation brings the newly opened screen into view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '3 месяца' }).click();
  await page.getByRole('button', { name: 'Открыть демо-кабинет' }).click();
  await expect(page.getByRole('heading', { name: 'Демо-кабинет' })).toBeInViewport();
  await expect(page.locator('.public-header .brand')).toBeInViewport();
  await page.getByRole('button', { name: 'Вернуться к тарифам' }).click();
  await expect(page.getByRole('heading', { name: 'Выберите пример тарифа' })).toBeInViewport();
});

test('bot status follows the visitor’s fictional plan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Выбрать Орбита' }).click();
  await page.getByRole('button', { name: 'Бот · симуляция' }).click();
  await page.getByRole('button', { name: '/start' }).click();
  await page.getByRole('button', { name: 'Моя подписка' }).click();
  await expect(page.getByText(/Орбита.*37 из 200 условных ГБ/)).toBeVisible();
});

test('bot: local scripted menu never sends messages or gives VPN credentials', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:18773/')) external.push(request.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Бот · симуляция' }).click();
  await expect(page.getByText('Сообщения не отправляются в Telegram')).toBeVisible();
  await page.getByRole('button', { name: '/start' }).click();
  await expect(page.getByText('Привет! Это вымышленное демо NoctVPN. Выберите пункт меню.')).toBeVisible();
  await page.getByRole('button', { name: 'Тарифы' }).click();
  await expect(page.getByText(/Фонарь · Горизонт · Орбита/)).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).click();
  await page.getByRole('button', { name: 'Моя подписка' }).click();
  await expect(page.getByText(/37 из 100 условных ГБ/)).toBeVisible();
  await page.getByRole('button', { name: 'Помощь' }).click();
  await expect(page.getByText(/Здесь показаны только вымышленные ответы/)).toBeVisible();
  await page.getByRole('button', { name: 'Попробовать подключить' }).click();
  await expect(page.getByText('В демо оплата и VPN-доступ недоступны.')).toBeVisible();
  expect(external).toEqual([]);
  expect(await page.locator('input, textarea, a[href*="t.me"], a[href*="telegram"], img').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Бот · симуляция' }).click();
  await expect(page.getByRole('button', { name: '/start' })).toBeVisible();
});
