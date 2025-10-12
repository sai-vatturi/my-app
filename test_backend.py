#!/usr/bin/env python3
"""
Test script to verify backend functionality
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Health check: {response.status_code} - {response.json()}")
    return response.status_code == 200

def test_create_squad():
    """Test creating a squad"""
    print("\nTesting squad creation...")
    squad_data = {
        "name": "Squad Alpha",
        "description": "Frontend development squad",
        "jira_board_id": "ALPHA-001",
        "team_lead": "John Doe",
        "product_owner": "Jane Smith",
        "products": []
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/squads/", json=squad_data)
    print(f"Squad creation: {response.status_code}")
    if response.status_code == 200:
        print(f"Created squad: {response.json()}")
        return response.json()["_id"]
    return None

def test_create_product():
    """Test creating a product"""
    print("\nTesting product creation...")
    product_data = {
        "name": "HK-MMB",
        "description": "Hong Kong MMB product",
        "platform": "DC",
        "country": "HK",
        "product_owner": "Alice Johnson",
        "technical_lead": "Bob Wilson",
        "jira_board_id": "HK-MMB-001",
        "squads": []
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/products/", json=product_data)
    print(f"Product creation: {response.status_code}")
    if response.status_code == 200:
        print(f"Created product: {response.json()}")
        return response.json()["_id"]
    return None

def test_create_release():
    """Test creating a release"""
    print("\nTesting release creation...")
    release_data = {
        "name": "Release 2024.1",
        "description": "January 2024 release",
        "release_date": "2024-01-15T00:00:00Z",
        "status": "planned",
        "scope": "New features and bug fixes",
        "jira_release_version": "2024.1",
        "participating_squads": [],
        "participating_products": []
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/releases/", json=release_data)
    print(f"Release creation: {response.status_code}")
    if response.status_code == 200:
        print(f"Created release: {response.json()}")
        return response.json()["_id"]
    return None

def test_get_all_endpoints():
    """Test getting all data from endpoints"""
    print("\nTesting GET endpoints...")
    
    endpoints = ["squads", "products", "releases", "runbooks", "files"]
    
    for endpoint in endpoints:
        response = requests.get(f"{BASE_URL}/api/v1/{endpoint}/")
        print(f"GET /{endpoint}: {response.status_code} - {len(response.json())} items")

def main():
    """Run all tests"""
    print("🚀 Testing Release Management Portal Backend")
    print("=" * 50)
    
    # Test health
    if not test_health():
        print("❌ Health check failed!")
        return
    
    print("✅ Health check passed!")
    
    # Test creating entities
    squad_id = test_create_squad()
    product_id = test_create_product()
    release_id = test_create_release()
    
    # Test getting all data
    test_get_all_endpoints()
    
    print("\n" + "=" * 50)
    print("🎉 Backend testing completed!")
    print(f"📊 Created: Squad={squad_id is not None}, Product={product_id is not None}, Release={release_id is not None}")

if __name__ == "__main__":
    main()
