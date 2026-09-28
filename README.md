# NOCT VPN — публичное демо / Public demo

**Живое демо / Live demo: https://noctvpn-demo.onrender.com/**

## Русский

Интерактивная демонстрация NoctVPN в визуальном языке основного сайта: главный экран, преимущества, пять тарифов из снимка публичного каталога, кабинет и диалог. Названия/сроки/условные рублёвые цены показаны **для ознакомления, не как действующая оферта**. Можно выбрать план для **предпросмотра** — ни один Trial, покупка, оплата или подключение не исполняются.

Демо-кабинет синхронизируется только с **отдельным демо-сервером** на Render Free. Он хранит временный случайный сеанс и выбранный план до 24 часов; после простоя/развёртывания состояние может сброситься. Никаких настоящих учётных записей, платёжных данных, VPN-конфигураций, QR или доступа к рабочим API и базам нет.

Встроенный в страницу бот **сценарный** и не отправляет сообщения в Telegram. Отдельный `@gitvpndemo_bot` сможет показывать тот же временный выбор после привязки одноразовой командой с сайта, **только после замены раскрытого ранее токена и включения отдельного webhook**. Пока он не подключён, сайт честно отмечает это; не отправляйте боту данные о себе или оплате.

Скриншоты сделаны только с этого демо: [сайт](screenshots/site.png), [кабинет](screenshots/cabinet.png), [сценарный чат](screenshots/bot.png). В публичном профиле скриншоты не размещаются.

### Локальная проверка

Node.js 22 и Python 3.12:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-demo.txt
npm ci
npm test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
npm run build
npm run browser
.venv/bin/python scripts/check_public_artifact.py
```

Playwright Chromium: `npx playwright install chromium`. Браузерные тесты запускают *только локальные* статический сайт и демо API с отключённым Telegram. Снимки: `npm run capture` после сборки. Не устанавливайте токен бота в проект или браузер: секреты задаются только в настройках отдельного хостинга после ротации.

## English

A visual and interactive NoctVPN showcase with the original site's layout and five public **catalog snapshot** plans. Prices are illustrative and **not an offer**. Trial, checkout, payment and VPN connection always stop at clearly labelled previews. There is no real account, billing, VPN key, QR, configuration or production integration.

The sample account uses an isolated, short-lived demo API; it may reset after a deployment or inactivity. The chat inside this site is scripted. A separate Telegram demo bot can share this temporary plan only after its previously disclosed token is rotated and a webhook is securely enabled; until then the site reports it as unavailable. Please do not send customer or payment information to this demo.

View the [site](screenshots/site.png), [sample account](screenshots/cabinet.png) and [scripted browser chat](screenshots/bot.png) screenshots. Run the commands above with Node.js 22/Python 3.12. All public Git revisions are checked for disallowed files and credential shapes.
