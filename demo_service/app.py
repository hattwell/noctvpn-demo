"""Public demo API. No auth, billing, provisioning, VPN, or production service imports."""
from __future__ import annotations

import hmac
import json
import os
import time
from collections import deque
from threading import Lock

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .bot import process_update, telegram_sender
from .store import CATALOG, PLAN_CODES, Session, Store

ORIGIN = 'https://noctvpn-demo.onrender.com'
BODY_LIMIT = 32 * 1024
UNAVAILABLE = 'Это только демонстрация: оплата, Trial и VPN-доступ недоступны.'


class RateLimit:
    def __init__(self, window: int = 60, maximum: int = 30):
        self.window, self.maximum = window, maximum
        self._buckets: dict[str, deque[float]] = {}
        self._lock = Lock()

    def admit(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._buckets.setdefault(key, deque())
            while hits and hits[0] <= now - self.window:
                hits.popleft()
            if len(hits) >= self.maximum:
                return False
            hits.append(now)
            return True


def create_app(store: Store, *, bot_token: str | None, webhook_secret: str | None, sender=None, enable_webhook: bool = False) -> FastAPI:
    app = FastAPI(title='NoctVPN fictional public demo', docs_url=None, redoc_url=None, openapi_url=None)
    app.state.store = store
    app.state.bot_token = bot_token
    app.state.webhook_secret = webhook_secret
    app.state.sender = sender
    app.state.bot_ready = False

    @app.on_event('startup')
    async def register_demo_webhook():
        if not (enable_webhook and bot_token and webhook_secret):
            return
        try:
            await (sender or telegram_sender(bot_token))('setWebhook', {
                'url': 'https://noctvpn-demo-api.onrender.com/v1/telegram/webhook',
                'secret_token': webhook_secret,
                'allowed_updates': ['message', 'callback_query'],
            })
            app.state.bot_ready = True
        except RuntimeError:
            app.state.bot_ready = False

    limiter = RateLimit()
    link_limiter = RateLimit(maximum=5)
    allowed_origins = [ORIGIN]
    if os.getenv('DEMO_ALLOW_LOCAL_ORIGIN') == '1':
        allowed_origins.append('http://127.0.0.1:18773')
    app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_methods=['GET', 'POST', 'PATCH'], allow_headers=['Authorization', 'Content-Type'], allow_credentials=False)

    @app.middleware('http')
    async def limit_request_size(request: Request, call_next):
        length = request.headers.get('content-length')
        if request.method in ('POST', 'PATCH'):
            if length is None:
                return Response(status_code=411)
            if not length.isdigit() or int(length) > BODY_LIMIT:
                return Response(status_code=413)
            if len(await request.body()) > BODY_LIMIT:
                return Response(status_code=413)
        response = await call_next(request)
        if request.url.path.startswith('/v1/session'):
            response.headers['Cache-Control'] = 'no-store'
        return response

    def current(request: Request) -> Session:
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail='Демо-сеанс не найден или истёк.')
        session = store.read(header[7:])
        if session is None:
            raise HTTPException(status_code=401, detail='Демо-сеанс не найден или истёк.')
        return session

    @app.get('/v1/health')
    def health():
        return {'ok': True, 'botReady': app.state.bot_ready, 'temporary': True}

    @app.get('/v1/catalog')
    def catalog():
        return CATALOG

    @app.post('/v1/session', status_code=201)
    def new_session(request: Request):
        ip = request.client.host if request.client else 'unknown'
        if not limiter.admit(ip):
            raise HTTPException(status_code=429, detail='Слишком много демо-сеансов. Попробуйте позже.')
        token = store.create()
        return {'token': token, 'expiresInSeconds': 24 * 3600}

    def public_state(session: Session) -> dict:
        plan = next(plan for plan in CATALOG if plan['code'] == session.plan_code)
        return {'planCode': session.plan_code, 'displayPriceRub': plan['rubPrice'], 'linked': session.chat_id is not None, 'status': 'demo_preview', 'expiresAt': session.expires}

    @app.get('/v1/session')
    def get_session(session: Session = Depends(current)):
        return public_state(session)

    @app.patch('/v1/session/plan')
    async def choose_plan(request: Request, session: Session = Depends(current)):
        try:
            body = await request.json()
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail='Некорректный демо-запрос.') from None
        code = body.get('planCode') if isinstance(body, dict) else None
        if not isinstance(code, str) or code not in PLAN_CODES:
            raise HTTPException(status_code=400, detail='Такого демо-тарифа нет.')
        header = request.headers['Authorization'][7:]
        return public_state(store.select(header, code))

    @app.post('/v1/session/link')
    def create_link(request: Request, session: Session = Depends(current)):
        if not link_limiter.admit(session.token_hash):
            raise HTTPException(status_code=429, detail='Слишком много запросов привязки. Попробуйте позже.')
        code = store.link_code(request.headers['Authorization'][7:])
        return {'command': f'/start {code}', 'expiresInSeconds': 600}

    @app.post('/v1/session/reset', status_code=204)
    def reset(request: Request, session: Session = Depends(current)):
        store.reset(request.headers['Authorization'][7:])
        return Response(status_code=204)

    for path in ('checkout', 'trial', 'connect'):
        def refused(session: Session = Depends(current)):
            raise HTTPException(status_code=403, detail=UNAVAILABLE)
        app.add_api_route('/v1/' + path, refused, methods=['POST'])

    @app.post('/v1/telegram/webhook')
    async def telegram_webhook(request: Request):
        if not bot_token or not webhook_secret:
            raise HTTPException(status_code=503, detail='Демо-бот ожидает безопасной настройки.')
        if not hmac.compare_digest(request.headers.get('X-Telegram-Bot-Api-Secret-Token', ''), webhook_secret):
            raise HTTPException(status_code=401, detail='Недействительный webhook.')
        try:
            update = await request.json()
            if not isinstance(update, dict):
                raise ValueError('invalid update')
            await process_update(update, store, sender or telegram_sender(bot_token))
        except (ValueError, json.JSONDecodeError):
            raise HTTPException(status_code=400, detail='Неподдерживаемое сообщение демо-боту.') from None
        except RuntimeError:
            raise HTTPException(status_code=503, detail='Демо-бот временно недоступен.') from None
        return {'ok': True}

    return app


DB_PATH = os.getenv('DEMO_SQLITE_PATH', '/tmp/noctvpn-public-demo.sqlite3')
app = create_app(Store(DB_PATH), bot_token=os.getenv('DEMO_BOT_TOKEN'), webhook_secret=os.getenv('DEMO_WEBHOOK_SECRET'), enable_webhook=os.getenv('DEMO_BOT_WEBHOOK_ENABLED') == '1')
