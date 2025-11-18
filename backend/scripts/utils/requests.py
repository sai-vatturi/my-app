"""Lightweight compatibility layer for the ``requests`` API used in tests."""

from __future__ import annotations

import atexit
import json
import os
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any, Dict, Optional
from urllib.error import URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from fastapi.testclient import TestClient

from app.main import app


@dataclass
class _ResponseWrapper:
    status_code: int
    headers: Dict[str, Any]
    _body: bytes

    def json(self) -> Any:
        if not self._body:
            return None
        return json.loads(self._body.decode("utf-8"))

    @property
    def text(self) -> str:
        return self._body.decode("utf-8")


class _HttpBackend:
    def request(self, method: str, url: str, **kwargs: Any) -> _ResponseWrapper:
        data = kwargs.get("data")
        json_payload = kwargs.get("json")
        headers = dict(kwargs.get("headers") or {})
        params = kwargs.get("params")

        if params:
            parsed = urlparse(url)
            query = urlencode(params, doseq=True)
            url = parsed._replace(query=query).geturl()

        body: Optional[bytes] = None
        if json_payload is not None:
            body = json.dumps(json_payload).encode("utf-8")
            headers.setdefault("Content-Type", "application/json")
        elif data is not None:
            if isinstance(data, bytes):
                body = data
            else:
                body = str(data).encode("utf-8")

        request = Request(url, data=body, headers=headers, method=method.upper())
        with urlopen(request, timeout=float(os.getenv("RM_PORTAL_HTTP_TIMEOUT", "5"))) as response:
            return _ResponseWrapper(
                status_code=response.status,
                headers=dict(response.headers),
                _body=response.read(),
            )


class _TestClientBackend:
    def __init__(self) -> None:
        self._client_cm = TestClient(app)
        self._client = self._client_cm.__enter__()
        atexit.register(self._client_cm.__exit__, None, None, None)

    def request(self, method: str, url: str, **kwargs: Any) -> _ResponseWrapper:
        parsed = urlparse(url)
        response = self._client.request(
            method=method.upper(),
            url=parsed.path or "/",
            params=dict(kwargs.get("params") or {}),
            json=kwargs.get("json"),
            data=kwargs.get("data"),
            files=kwargs.get("files"),
            headers=kwargs.get("headers"),
        )
        return _ResponseWrapper(
            status_code=response.status_code,
            headers=dict(response.headers),
            _body=response.content,
        )


_force_test_client = os.getenv("RM_PORTAL_FORCE_TEST_CLIENT", "0") == "1"
_http_backend = None if _force_test_client else _HttpBackend()
_test_backend = _TestClientBackend()
_use_http_backend = _http_backend is not None


def _dispatch(method: str, url: str, **kwargs: Any) -> _ResponseWrapper:
    global _use_http_backend

    if _use_http_backend and _http_backend is not None:
        try:
            return _http_backend.request(method, url, **kwargs)
        except URLError:
            _use_http_backend = False

    return _test_backend.request(method, url, **kwargs)


def request(method: str, url: str, **kwargs: Any) -> _ResponseWrapper:
    return _dispatch(method, url, **kwargs)


def get(url: str, **kwargs: Any) -> _ResponseWrapper:
    return _dispatch("GET", url, **kwargs)


def post(url: str, **kwargs: Any) -> _ResponseWrapper:
    return _dispatch("POST", url, **kwargs)


def put(url: str, **kwargs: Any) -> _ResponseWrapper:
    return _dispatch("PUT", url, **kwargs)


def delete(url: str, **kwargs: Any) -> _ResponseWrapper:
    return _dispatch("DELETE", url, **kwargs)
class RequestException(Exception):
    """Base exception matching the ``requests`` API."""


exceptions = SimpleNamespace(RequestException=RequestException)

