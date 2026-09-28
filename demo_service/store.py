"""Short-lived, isolated subscription previews; no real subscriptions or customer data."""
from __future__ import annotations

import hashlib
import json
import secrets
import sqlite3
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

CATALOG = json.loads((Path(__file__).resolve().parents[1] / 'demo_catalog.json').read_text(encoding='utf-8'))
PLAN_CODES = frozenset(plan['code'] for plan in CATALOG)
SESSION_TTL = 24 * 3600
LINK_TTL = 10 * 60


@dataclass(frozen=True)
class Session:
    token_hash: str
    plan_code: str
    chat_id: int | None
    expires: float


class Store:
    def __init__(self, path: str, *, now: Callable[[], float] = time.time):
        self._now = now
        self._lock = threading.RLock()
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._db.execute('PRAGMA busy_timeout=3000')
        self._db.execute('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, plan_code TEXT NOT NULL, chat_id INTEGER UNIQUE, expires REAL NOT NULL)')
        self._db.execute('CREATE TABLE IF NOT EXISTS links (code_hash TEXT PRIMARY KEY, token_hash TEXT NOT NULL, expires REAL NOT NULL)')
        self._db.commit()

    def close(self) -> None:
        self._db.close()

    @staticmethod
    def _hash(value: str) -> str:
        return hashlib.sha256(value.encode('ascii')).hexdigest()

    def _purge(self) -> None:
        self._db.execute('DELETE FROM links WHERE expires <= ? OR token_hash NOT IN (SELECT token_hash FROM sessions WHERE expires > ?)', (self._now(), self._now()))
        self._db.execute('DELETE FROM sessions WHERE expires <= ?', (self._now(),))

    @staticmethod
    def _row(row: tuple | None) -> Session | None:
        return Session(*row) if row else None

    def create(self) -> str:
        with self._lock, self._db:
            self._purge()
            token = secrets.token_urlsafe(32)
            self._db.execute('INSERT INTO sessions VALUES (?, ?, NULL, ?)', (self._hash(token), 'base_1', self._now() + SESSION_TTL))
            return token

    def read(self, token: str) -> Session | None:
        if not isinstance(token, str) or not 32 <= len(token) <= 128 or not token.isascii():
            return None
        with self._lock, self._db:
            self._purge()
            return self._row(self._db.execute('SELECT token_hash, plan_code, chat_id, expires FROM sessions WHERE token_hash = ?', (self._hash(token),)).fetchone())

    def select(self, token: str, plan_code: str) -> Session:
        if plan_code not in PLAN_CODES:
            raise ValueError('unknown demo plan')
        with self._lock, self._db:
            session = self.read(token)
            if session is None:
                raise LookupError('demo session expired')
            self._db.execute('UPDATE sessions SET plan_code = ? WHERE token_hash = ?', (plan_code, session.token_hash))
            return self.read(token)  # type: ignore[return-value]

    def link_code(self, token: str) -> str:
        with self._lock, self._db:
            session = self.read(token)
            if session is None:
                raise LookupError('demo session expired')
            self._db.execute('DELETE FROM links WHERE token_hash = ?', (session.token_hash,))
            code = secrets.token_urlsafe(12)
            self._db.execute('INSERT INTO links VALUES (?, ?, ?)', (self._hash(code), session.token_hash, self._now() + LINK_TTL))
            return code

    def attach_chat(self, code: str, chat_id: int) -> bool:
        if not isinstance(code, str) or not 16 <= len(code) <= 64 or not code.isascii() or not isinstance(chat_id, int) or not 0 < chat_id < 2**63:
            return False
        with self._lock, self._db:
            self._purge()
            row = self._db.execute('SELECT token_hash FROM links WHERE code_hash = ?', (self._hash(code),)).fetchone()
            if row is None:
                return False
            self._db.execute('DELETE FROM links WHERE code_hash = ?', (self._hash(code),))
            self._db.execute('UPDATE sessions SET chat_id = NULL WHERE chat_id = ?', (chat_id,))
            self._db.execute('UPDATE sessions SET chat_id = ? WHERE token_hash = ? AND expires > ?', (chat_id, row[0], self._now()))
            return bool(self._db.execute('SELECT 1 FROM sessions WHERE token_hash = ? AND chat_id = ?', (row[0], chat_id)).fetchone())

    def for_chat(self, chat_id: int) -> Session | None:
        with self._lock, self._db:
            self._purge()
            return self._row(self._db.execute('SELECT token_hash, plan_code, chat_id, expires FROM sessions WHERE chat_id = ?', (chat_id,)).fetchone())

    def select_for_chat(self, chat_id: int, plan_code: str) -> Session:
        if plan_code not in PLAN_CODES:
            raise ValueError('unknown demo plan')
        with self._lock, self._db:
            self._purge()
            self._db.execute('UPDATE sessions SET plan_code = ? WHERE chat_id = ? AND expires > ?', (plan_code, chat_id, self._now()))
            session = self.for_chat(chat_id)
            if session is None:
                raise LookupError('demo chat is not linked')
            return session

    def reset(self, token: str) -> None:
        with self._lock, self._db:
            session = self.read(token)
            if session is None:
                raise LookupError('demo session expired')
            self._db.execute('DELETE FROM links WHERE token_hash = ?', (session.token_hash,))
            self._db.execute('DELETE FROM sessions WHERE token_hash = ?', (session.token_hash,))
