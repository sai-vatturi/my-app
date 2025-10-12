"""Test-friendly stand-in for the ``requests`` library.

The project tests exercise the HTTP API without actually running a web server.
To keep the public FastAPI application unchanged we expose a tiny shim that
forwards calls to a FastAPI ``TestClient`` instance.  Only the subset of the
``requests`` API used by the tests is implemented (``get``, ``post``, ``put``
 and ``delete``).
"""

from __future__ import annotations

import atexit
from dataclasses import dataclass
from typing import Any, Dict
from urllib.parse import parse_qsl, urlparse

from fastapi.testclient import TestClient

from app.main import app


@dataclass
class _ResponseWrapper:
    """Small wrapper mimicking the ``requests.Response`` interface."""

    _response: Any

    @property
    def status_code(self) -> int:
        return self._response.status_code

    @property
    def text(self) -> str:
        return self._response.text

    @property
    def headers(self) -> Dict[str, Any]:
        return dict(self._response.headers)

    def json(self) -> Any:
        return self._response.json()


class _RequestsShim:
    def __init__(self) -> None:
        self._client_cm = TestClient(app)
        self._client = self._client_cm.__enter__()
        atexit.register(self._client_cm.__exit__, None, None, None)

    def _request(self, method: str, url: str, **kwargs: Any) -> _ResponseWrapper:
        parsed = urlparse(url)
        path = parsed.path or "/"
        query_params = dict(parse_qsl(parsed.query)) if parsed.query else None

        response = self._client.request(
            method=method.upper(),
            url=path,
            params=query_params,
            json=kwargs.get("json"),
            data=kwargs.get("data"),
            files=kwargs.get("files"),
            headers=kwargs.get("headers"),
        )
        return _ResponseWrapper(response)

    def get(self, url: str, **kwargs: Any) -> _ResponseWrapper:
        return self._request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> _ResponseWrapper:
        return self._request("POST", url, **kwargs)

    def put(self, url: str, **kwargs: Any) -> _ResponseWrapper:
        return self._request("PUT", url, **kwargs)

    def delete(self, url: str, **kwargs: Any) -> _ResponseWrapper:
        return self._request("DELETE", url, **kwargs)


_client = _RequestsShim()


def get(url: str, **kwargs: Any) -> _ResponseWrapper:
    return _client.get(url, **kwargs)


def post(url: str, **kwargs: Any) -> _ResponseWrapper:
    return _client.post(url, **kwargs)


def put(url: str, **kwargs: Any) -> _ResponseWrapper:
    return _client.put(url, **kwargs)


def delete(url: str, **kwargs: Any) -> _ResponseWrapper:
    return _client.delete(url, **kwargs)
