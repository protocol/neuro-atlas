"""Strict OpenAlex GET transport. curl imports the credential handle internally.

Never read the credential in Python, interpolate it in a shell, follow redirects,
print stderr, or fall back to anonymous requests. No shell is used.
"""
from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
import re
import subprocess
import threading
import time
from typing import Any
from urllib.parse import urlencode

BASE = 'https://api.openalex.org'
_ALLOWED_PARAMS = {'filter', 'select', 'per_page', 'cursor', 'sort', 'corpus', 'group_by'}
_ALLOWED_GROUPINGS = {
    'publication_year',
    'publication_year,authorships.institutions.type:include_unknown',
    'publication_year,type,primary_location.source.type:include_unknown',
}


class TransportError(RuntimeError):
    pass


def curl_command(path: str, params: dict[str, Any]) -> list[str]:
    if not re.fullmatch(r'/(?:works(?:/W[0-9]+)?|authors|rate-limit)', path):
        raise ValueError('Disallowed OpenAlex route')
    if set(params) - _ALLOWED_PARAMS:
        raise ValueError('Disallowed query parameter')
    for value in params.values():
        if not isinstance(value, (str, int)) or any(c in str(value) for c in ('\r', '\n', '\x00')):
            raise ValueError('Invalid query value')
    if 'group_by' in params and (path != '/works' or params['group_by'] not in _ALLOWED_GROUPINGS):
        raise ValueError('Disallowed OpenAlex grouping')
    if '://' in str(params.get('cursor', '')) or str(params.get('cursor', '')).startswith('//'):
        raise ValueError('Cursor must be an opaque token, not a URL')
    if 'per_page' in params and not 1 <= int(params['per_page']) <= 100:
        raise ValueError('OpenAlex page size must be 1..100')
    if path == '/rate-limit' and params:
        raise ValueError('Quota route takes no query')
    url = BASE + path + ('?' + urlencode(sorted(params.items())) if params else '')
    return ['curl', '-q', '--proto', '=https', '--max-redirs', '0',
            '--connect-timeout', '10', '--max-time', '60', '--max-filesize', '33554432', '--silent',
            '--request', 'GET', '--variable', '%OPENALEX_API_KEY',
            '--expand-header', 'Authorization: Bearer {{OPENALEX_API_KEY}}',
            '--write-out', '\n%{http_code}\t%{content_type}\t%header{x-ratelimit-remaining}\t%header{x-ratelimit-remaining-usd}\t%header{x-ratelimit-credits-used}', url]


class CurlTransport:
    def __init__(self) -> None:
        self._dispatch_lock = threading.Lock()
        self._last_dispatch = 0.0
        self._response = threading.local()
        self.free_credits_remaining: int | None = None

    def response_metadata(self) -> dict[str,int]:
        return dict(getattr(self._response,'quota',{}))

    def get(self, path: str, params: dict[str, Any]) -> bytes:
        command = curl_command(path, params)
        with self._dispatch_lock:
            delay = 0.125 - (time.monotonic() - self._last_dispatch)
            if delay > 0:
                time.sleep(delay)
            self._last_dispatch = time.monotonic()
        try:
            result = subprocess.run(command, capture_output=True, check=False, timeout=65)
        except (OSError, subprocess.TimeoutExpired):
            raise TransportError('OpenAlex curl transport failed (details withheld)') from None
        if result.returncode:
            raise TransportError(f'OpenAlex curl failed with exit {result.returncode}; no auth fallback')
        body, separator, metadata = result.stdout.rpartition(b'\n')
        fields = metadata.split(b'\t')
        if not separator or len(fields) != 5 or len(body) > 33554432:
            raise TransportError('Invalid/oversized OpenAlex response envelope')
        status,content_type,remaining,remaining_usd,used = fields
        quota: dict[str,int] = {}
        if remaining.isdigit():
            quota['credits_remaining'] = int(remaining)
        if remaining_usd:
            try:
                free = int(Decimal(remaining_usd.decode('ascii')) / Decimal('0.0001'))
                quota['credits_remaining'] = min(quota.get('credits_remaining',free),free)
            except (ValueError,UnicodeError,InvalidOperation,OverflowError):
                raise TransportError('Invalid numeric source quota header') from None
        if used.isdigit():
            quota['credits_used_this_request'] = int(used)
        self._response.quota = quota
        if 'credits_remaining' in quota:
            with self._dispatch_lock:
                self.free_credits_remaining = min(self.free_credits_remaining if self.free_credits_remaining is not None else quota['credits_remaining'],quota['credits_remaining'])
        if status != b'200':
            code = status.decode('ascii', errors='ignore') if status.isdigit() else 'unknown'
            raise TransportError(f'OpenAlex HTTP {code}; stopped without retry or auth fallback')
        media_type = content_type.decode('ascii',errors='ignore').split(';')[0].lower()
        if media_type != 'application/json' and not (media_type.startswith('application/') and media_type.endswith('+json')):
            raise TransportError('OpenAlex content type is not JSON')
        try:
            value = json.loads(body)
        except (ValueError, UnicodeError):
            raise TransportError('OpenAlex returned invalid JSON') from None
        if not isinstance(value, dict):
            raise TransportError('OpenAlex response must be an object')
        return body
