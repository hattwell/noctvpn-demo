"""Limited Telegram demo menu. Never creates payments, VPN credentials or real users."""
from __future__ import annotations

from typing import Awaitable, Callable

import httpx

from .store import CATALOG, PLAN_CODES, Store

Send = Callable[[str, dict], Awaitable[None]]
MAIN = ('Моя подписка', 'Купить / продлить', 'Подключить устройство', 'Инструкции', 'История', 'FAQ', 'Поддержка', 'Аккаунт', 'Документы')
GUEST = ('Тарифы', 'Инструкции', 'FAQ', 'Документы', 'Поддержка')
PLATFORMS = {'ios': 'iPhone / iPad', 'android': 'Android', 'windows': 'Windows', 'macos': 'macOS', 'linux': 'Linux', 'tv': 'ТВ'}
REFUSAL = 'Это демо: оплата, Trial и VPN-доступ недоступны. Настоящие ключи и ссылки не выдаются.'


def menu(linked: bool) -> dict:
    labels = MAIN if linked else GUEST
    return {'keyboard': [[{'text': text} for text in labels[index:index + 2]] for index in range(0, len(labels), 2)], 'resize_keyboard': True}


def plan_keyboard() -> dict:
    return {'inline_keyboard': [[{'text': f"{plan['name']} · {plan['rubPrice']} ₽", 'callback_data': 'plan:' + plan['code']}] for plan in CATALOG if plan['code'] != 'trial']}


def telegram_sender(token: str) -> Send:
    async def send(method: str, payload: dict) -> None:
        try:
            async with httpx.AsyncClient(timeout=7.0) as client:
                response = await client.post(f'https://api.telegram.org/bot{token}/{method}', json=payload)
                response.raise_for_status()
                if response.json().get('ok') is not True:
                    raise RuntimeError('Demo Telegram delivery failed')
        except (httpx.HTTPError, ValueError):
            # Do not log exception URLs: Telegram API URLs contain the bot token.
            raise RuntimeError('Demo Telegram delivery failed') from None
    return send


async def process_update(update: dict, store: Store, send: Send) -> None:
    if not isinstance(update.get('update_id'), int) or update['update_id'] < 0:
        raise ValueError('invalid update')
    if 'pre_checkout_query' in update or 'shipping_query' in update:
        raise ValueError('payments are not accepted')
    if ('message' in update) == ('callback_query' in update):
        raise ValueError('unsupported update')
    callback = update.get('callback_query')
    message = update.get('message') if callback is None else callback.get('message') if isinstance(callback, dict) else None
    if not isinstance(message, dict) or not isinstance(message.get('chat'), dict):
        raise ValueError('invalid chat')
    chat_id = message['chat'].get('id')
    if not isinstance(chat_id, int) or chat_id <= 0:
        raise ValueError('invalid chat')
    if 'successful_payment' in message or 'invoice' in message:
        raise ValueError('payments are not accepted')
    linked = store.for_chat(chat_id)
    if callback is not None:
        data = callback.get('data')
        callback_id = callback.get('id')
        if not isinstance(callback_id, str) or not 1 <= len(callback_id) <= 128 or not isinstance(data, str) or len(data) > 64:
            raise ValueError('invalid callback')
        if data.startswith('plan:') and data[5:] not in PLAN_CODES:
            raise ValueError('invalid demo plan')
        if data.startswith('platform:') and data[9:] not in PLATFORMS:
            raise ValueError('invalid platform')
        if not (data.startswith('plan:') or data.startswith('platform:')):
            raise ValueError('unsupported callback')
        await send('answerCallbackQuery', {'callback_query_id': callback_id})
        if data.startswith('platform:'):
            text = f"{PLATFORMS[data[9:]]}: установите совместимое приложение. В демо нет ссылки подключения или VPN-конфигурации."
        elif linked is None:
            text = 'Сначала свяжите сайт и демо-бота через одноразовую команду на сайте.'
        else:
            selection = store.select_for_chat(chat_id, data[5:])
            plan = next(item for item in CATALOG if item['code'] == selection.plan_code)
            text = f"Выбран {plan['name']} · {plan['rubPrice']} ₽ (снимок тарифа). Это предпросмотр, покупки и подключения нет."
        await send('sendMessage', {'chat_id': chat_id, 'text': text, 'reply_markup': menu(linked is not None)})
        return

    text = message.get('text')
    if not isinstance(text, str) or len(text) > 256:
        raise ValueError('unsupported message')
    text = text.strip()
    markup: dict = menu(linked is not None)
    if text.startswith('/start '):
        code = text[7:].strip()
        if store.attach_chat(code, chat_id):
            linked = store.for_chat(chat_id)
            answer = 'Демо-сеанс связан с сайтом. Это только предпросмотр, без оплаты и VPN-доступа.'
            markup = menu(True)
        else:
            answer = 'Код демо-привязки недействителен или истёк. Получите новый на сайте.'
    elif text in ('/start', '/menu', 'Главное меню'):
        answer = ('Главное меню NOCT VPN · демо. Нет реальных покупок и VPN.' if linked else 'NOCT VPN · демо. Посмотрите тарифы и инструкции; для общей демо-подписки получите код на сайте.')
    elif text in ('/plans', 'Тарифы', 'Купить / продлить'):
        answer = 'Тарифы NOCT VPN · снимок для демо, не оферта. Выберите для предпросмотра; оплата недоступна.'
        markup = plan_keyboard()
    elif text in ('/subscription', 'Моя подписка'):
        if linked is None:
            answer = 'Демо-сеанс не связан. Получите одноразовый код в демо-кабинете сайта.'
        else:
            plan = next(item for item in CATALOG if item['code'] == linked.plan_code)
            answer = f"Моя подписка · предпросмотр: {plan['name']}, {plan['rubPrice']} ₽. Статус: демо; действующего VPN-доступа нет."
    elif text in ('Получить Trial', 'Оплатить', 'Подключить устройство', '/connect'):
        answer = REFUSAL
    elif text in ('Инструкции', '/instructions'):
        answer = 'Выберите платформу. Демо показывает только общие шаги — без ключей, QR и ссылок подключения.'
        markup = {'inline_keyboard': [[{'text': label, 'callback_data': 'platform:' + code}] for code, label in PLATFORMS.items()]}
    elif text in ('История', '/history'):
        answer = ('История демо: просмотр тарифа. Списаний и настоящих заказов нет.' if linked else 'История доступна после привязки демо-сеанса. Настоящих платежей здесь нет.')
    elif text in ('FAQ', '/help'):
        answer = 'FAQ: Trial — 7 дней и 20 ГБ в полной версии; Base — до 5 устройств, Family — до 15. В этом демо нельзя получить доступ или оплатить.'
    elif text in ('Поддержка', '/support'):
        answer = 'Поддержка · демо: здесь только пример раздела. Сообщения не направляются настоящей поддержке.'
    elif text in ('Аккаунт', '/account'):
        answer = ('Демо-сеанс привязан. Мы не создаём настоящий аккаунт.' if linked else 'Нет настоящего аккаунта. Привязка демо доступна через сайт.')
    elif text in ('Документы', '/documents'):
        answer = 'Документы · демо: юридические условия полной версии не применяются к этому предпросмотру. Покупка недоступна.'
    else:
        answer = 'Не удалось распознать команду. Используйте кнопки демо-меню.'
    await send('sendMessage', {'chat_id': chat_id, 'text': answer, 'reply_markup': markup})
