# NOCT VPN — публичное демо / Public demo

**Живое демо / Live demo: https://noctvpn-demo.onrender.com/**

## Русский

Интерактивная **статическая демонстрация** интерфейса NoctVPN. Сохранён визуальный язык сайта: тёмный фон, зелёный акцент, крупный первый экран и круговая иллюстрация. Здесь можно выбрать придуманный тариф и период, открыть вымышленный кабинет и пройти заранее написанный сценарий бота прямо в браузере.

**Важно:** это не настоящий VPN. Здесь нет регистрации, оплаты, подключения, серверов, конфигураций, реальных аккаунтов или данных пользователей. Бот не связан с Telegram: кнопки показывают только локальные, заранее написанные ответы. Полный продукт и его Telegram-бот существуют отдельно и **не подключены** к этому демо.

### Что посмотреть

- [Сайт](screenshots/site.png) — пример главной страницы;
- [Демо-кабинет](screenshots/cabinet.png) — условная подписка и история без списаний;
- [Бот · симуляция](screenshots/bot.png) — меню `/start`, тарифы, статус и помощь.

Скриншоты сняты **только с этого демо**. Ссылка выше ведёт на отдельный статический сайт, не на рабочий сервис.

### Локальный запуск

Нужен Node.js 22. `npm ci && npm run build && npm run preview`. Откройте `http://127.0.0.1:18773/`. Тесты: `npm test`, `npm run browser` (после сборки и установки Chromium через `npx playwright install chromium`), `python3 -m unittest discover -s tests -p 'test_*.py'` и `python3 scripts/check_public_artifact.py` в опубликованном репозитории. Скриншоты демо: `npm run capture` после сборки.

## English

An interactive **static showcase** of the NoctVPN interface. It keeps the website's visual language while letting you select a fictional plan and period, explore a sample account and try a fixed-script bot inside the page.

**Not a real VPN:** no registration, payments, connections, servers, configurations, customer accounts or personal data. The bot sends nothing to Telegram and displays only predefined local replies. The full product and its Telegram bot are separate and **not connected** to this demo.

See the [site](screenshots/site.png), [sample account](screenshots/cabinet.png) and [scripted bot](screenshots/bot.png) screenshots — all captured from this demo, not from the live product. Use the verified live demo URL above; it leads only to the standalone static site.

To run locally with Node.js 22: `npm ci && npm run build && npm run preview`; open `http://127.0.0.1:18773/`. Run `npm test` and `npm run browser` after installing Playwright Chromium. This repository has no backend, environment secrets, API client or production integration.
