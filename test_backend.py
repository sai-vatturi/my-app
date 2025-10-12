#!/usr/bin/env python3
"""Utility script used by the kata-style tests to exercise the API."""

from __future__ import annotations

import os
from typing import Any, Dict, Iterable, Optional
from urllib.parse import urljoin

from fastapi.testclient import TestClient
import requests
from requests import exceptions as requests_exceptions

from app.main import app


BASE_URL = os.environ.get("RM_PORTAL_BASE_URL", "http://localhost:8000")

_test_client = TestClient(app)
_use_in_process_client = False


def _request(method: str, path: str, **kwargs: Any):
    """Issue a request against the running API or fall back to TestClient."""

    global _use_in_process_client

    if not _use_in_process_client:
        target = urljoin(BASE_URL.rstrip("/") + "/", path.lstrip("/"))
        try:
            return requests.request(method, target, timeout=5, **kwargs)
        except requests_exceptions.RequestException as exc:
            print(f"⚠️ Unable to reach backend at {target}: {exc}. Using in-process client instead.")
            _use_in_process_client = True

    return _test_client.request(method, path, **kwargs)


def test_health() -> bool:
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = _request("GET", "/health")
    print(f"Health check: {response.status_code} - {response.json()}")
    return response.status_code == 200


def test_create_squad() -> Optional[str]:
    """Test creating a squad"""
    print("\nTesting squad creation...")
    squad_data: Dict[str, Any] = {
        "name": "Squad Alpha",
        "description": "Frontend development squad",
        "jira_board_id": "ALPHA-001",
        "team_lead": "John Doe",
        "product_owner": "Jane Smith",
        "products": [],
    }

    response = _request("POST", "/api/v1/squads/", json=squad_data)
    print(f"Squad creation: {response.status_code}")
    if response.status_code == 200:
        payload = response.json()
        print(f"Created squad: {payload}")
        return payload.get("_id")
    return None


def test_create_product() -> Optional[str]:
    """Test creating a product"""
    print("\nTesting product creation...")
    product_data: Dict[str, Any] = {
        "name": "HK-MMB",
        "description": "Hong Kong MMB product",
        "platform": "DC",
        "country": "HK",
        "product_owner": "Alice Johnson",
        "technical_lead": "Bob Wilson",
        "jira_board_id": "HK-MMB-001",
        "squads": [],
    }

    response = _request("POST", "/api/v1/products/", json=product_data)
    print(f"Product creation: {response.status_code}")
    if response.status_code == 200:
        payload = response.json()
        print(f"Created product: {payload}")
        return payload.get("_id")
    return None


def test_create_release() -> Optional[str]:
    """Test creating a release"""
    print("\nTesting release creation...")
    release_data: Dict[str, Any] = {
        "name": "Release 2024.1",
        "description": "January 2024 release",
        "release_date": "2024-01-15T00:00:00Z",
        "status": "planned",
        "scope": "New features and bug fixes",
        "jira_release_version": "2024.1",
        "participating_squads": [],
        "participating_products": [],
    }

    response = _request("POST", "/api/v1/releases/", json=release_data)
    print(f"Release creation: {response.status_code}")
    if response.status_code == 200:
        payload = response.json()
        print(f"Created release: {payload}")
        return payload.get("_id")
    return None


def test_get_all_endpoints() -> None:
    """Test getting all data from endpoints"""
    print("\nTesting GET endpoints...")

    endpoints: Iterable[str] = ["squads", "products", "releases", "runbooks", "files"]

    for endpoint in endpoints:
        response = _request("GET", f"/api/v1/{endpoint}/")
        print(f"GET /{endpoint}: {response.status_code} - {len(response.json())} items")


def main() -> None:
    """Run all tests"""
    print("🚀 Testing Release Management Portal Backend")
    print("=" * 50)

    if not test_health():
        print("❌ Health check failed!")
        return

    print("✅ Health check passed!")

    squad_id = test_create_squad()
    product_id = test_create_product()
    release_id = test_create_release()

    test_get_all_endpoints()

    print("\n" + "=" * 50)
    print("🎉 Backend testing completed!")
    print(f"📊 Created: Squad={squad_id is not None}, Product={product_id is not None}, Release={release_id is not None}")


if __name__ == "__main__":
    main()
