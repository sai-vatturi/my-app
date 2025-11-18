#!/usr/bin/env python3
"""
Minimal test to isolate the schema issue
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# Test with the exact same data structure that works for simple products
simple_data = {
    "name": "Minimal Test",
    "platform": "DC"
}

print("Testing simple product (should work)...")
response = requests.post(f"{BASE_URL}/api/v1/products/", json=simple_data)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("✅ Simple product works")
else:
    print(f"❌ Simple product failed: {response.text}")

# Test with empty jira_boards array
empty_boards_data = {
    "name": "Empty Boards Test",
    "platform": "DC",
    "jira_boards": []
}

print("\nTesting with empty jira_boards array...")
response = requests.post(f"{BASE_URL}/api/v1/products/", json=empty_boards_data)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("✅ Empty boards work")
else:
    print(f"❌ Empty boards failed: {response.text}")

# Test with single jira board
single_board_data = {
    "name": "Single Board Test",
    "platform": "DC",
    "jira_boards": [
        {
            "board_id": "SINGLE-001",
            "board_name": "Single Board"
        }
    ]
}

print("\nTesting with single jira board...")
response = requests.post(f"{BASE_URL}/api/v1/products/", json=single_board_data)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("✅ Single board works")
    print(f"Response: {response.json()}")
else:
    print(f"❌ Single board failed: {response.text}")
