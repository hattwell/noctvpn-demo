"""Public-only source and Git-history gate. Reports rule and path, never file content."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT_FILES = {
    '.gitignore', '.python-version', 'index.html', 'package.json', 'package-lock.json', 'tsconfig.json',
    'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'README.md', 'render.yaml',
    'demo_catalog.json', 'requirements-demo.txt',
}
EXACT_FILES = {'scripts/__init__.py', 'scripts/check_public_artifact.py',
               'scripts/capture.mjs', 'tests/demo.spec.ts', 'tests/test_public_artifact.py',
               'tests/test_demo_store.py', 'tests/test_demo_api.py', 'tests/test_demo_bot.py',
               '.github/workflows/checks.yml'}
SOURCE = re.compile(r'^src/[A-Za-z0-9_-]+(?:\.test)?\.(?:ts|tsx|css)$')
BACKEND = re.compile(r'^demo_service/[A-Za-z0-9_]+\.py$')
SCREENSHOT = re.compile(r'^screenshots/(site|cabinet|bot)\.png$')
URL = re.compile(rb'https?://[a-z0-9.-]+(?::\d+)?(?:/[A-Za-z0-9_/?=.%${}+-]*)?', re.I)
ALLOWED_URLS = (
    b'https://noctvpn-demo-api.onrender.com', b'https://noctvpn-demo.onrender.com',
    b'http://127.0.0.1:18773', b'http://127.0.0.1:18774',
    b'https://t.me/gitvpndemo_bot',
)
SECRET_SHAPE = re.compile(rb'\b\d{8,12}:[A-Za-z0-9_-]{35,}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk_[A-Za-z0-9]{20,}\b')
UNSAFE_SOURCE = [
    ('network-client', re.compile(rb'\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(|window\.open\s*\(')),
    ('private-browser-state', re.compile(rb'import\.meta\.env|\b(?:localStorage|sessionStorage)\b|document\.cookie')),
    ('credential-input', re.compile(rb'<(?:input|form|textarea)\b', re.I)),
]


def allowlisted(path: str) -> bool:
    return path in ROOT_FILES or path in EXACT_FILES or bool(SOURCE.fullmatch(path) or BACKEND.fullmatch(path) or SCREENSHOT.fullmatch(path))


def inspect_bytes(path: str, content: bytes) -> list[str]:
    findings = []
    if SECRET_SHAPE.search(content):
        findings.append(f'{path}: secret-shape')
    if (SOURCE.fullmatch(path) and '.test.' not in path) or BACKEND.fullmatch(path) or path == 'index.html':
        for match in URL.finditer(content):
            value = match.group()
            allowed = any(value.startswith(base) and (len(value) == len(base) or value[len(base):len(base) + 1] in (b'/', b'?')) for base in ALLOWED_URLS)
            if path == 'demo_service/bot.py' and value.startswith(b'https://api.telegram.org/bot{token}/'):
                allowed = True
            if not allowed:
                findings.append(f'{path}: external-network')
        if BACKEND.fullmatch(path) and re.search(rb'\b(?:from|import)\s+noctvpn\b|noctvpn-private', content):
            findings.append(f'{path}: backend-import')
        if SOURCE.fullmatch(path) or path == 'index.html':
            for rule, pattern in UNSAFE_SOURCE:
                if rule == 'private-browser-state' and path in ('src/App.tsx', 'src/demoClient.ts'):
                    if re.search(rb'import\.meta\.env|sessionStorage|document\.cookie', content):
                        findings.append(f'{path}: {rule}')
                    continue
                if pattern.search(content):
                    findings.append(f'{path}: {rule}')
            if re.search(rb'@noctvpn_bot|api\.telegram\.org|noctvpn-private', content, re.I):
                findings.append(f'{path}: external-network')
    if SCREENSHOT.fullmatch(path) and (not content.startswith(b'\x89PNG\r\n\x1a\n') or len(content) > 4_000_000):
        findings.append(f'{path}: screenshot-format-or-size')
    return findings


def inspect_public_paths(root: Path, paths: list[str]) -> list[str]:
    findings = []
    for path in paths:
        if not allowlisted(path):
            findings.append(f'{path}: not-allowlisted')
            continue
        target = root / path
        if target.is_symlink():
            findings.append(f'{path}: symlink')
        elif not target.is_file():
            findings.append(f'{path}: missing')
        else:
            findings.extend(inspect_bytes(path, target.read_bytes()))
    return findings


def git(root: Path, *args: str) -> bytes:
    return subprocess.run(['git', *args], cwd=root, check=True, capture_output=True).stdout


def inspect_history(root: Path) -> list[str]:
    findings = []
    for revision in git(root, 'rev-list', '--all').decode().splitlines():
        paths = [path.decode() for path in git(root, 'ls-tree', '-r', '-z', '--name-only', revision).split(b'\0') if path]
        for path in paths:
            if not allowlisted(path):
                findings.append(f'{revision[:10]}/{path}: not-allowlisted')
                continue
            kind = git(root, 'ls-tree', revision, '--', path).split(b' ', 1)[0]
            if kind == b'120000':
                findings.append(f'{revision[:10]}/{path}: symlink')
                continue
            data = git(root, 'show', f'{revision}:{path}')
            findings.extend(f'{revision[:10]}/{rule}' for rule in inspect_bytes(path, data))
    return findings


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    paths = [path.decode() for path in git(root, 'ls-files', '-z').split(b'\0') if path]
    findings = inspect_public_paths(root, paths) + inspect_history(root)
    if findings:
        for finding in sorted(set(findings)):
            print(finding, file=sys.stderr)
        return 1
    print(f'Public artifact and all Git revisions checked: {len(paths)} allowlisted files, no findings.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
