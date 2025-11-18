#!/usr/bin/env python3
"""
Test script to verify the updated release schema with new structure
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_new_release_schema():
    """Test creating a release with the new schema structure"""
    print("Testing new release schema structure...")
    
    # Create a sample product first (if needed)
    product_data = {
        "name": "Test Product for Release",
        "description": "Test product",
        "platform": "DC",
        "country": "HK"
    }
    
    product_response = requests.post(f"{BASE_URL}/api/v1/products/", json=product_data)
    if product_response.status_code == 200:
        product_id = product_response.json()["_id"]
        print(f"✅ Created test product: {product_id}")
    else:
        print("❌ Failed to create test product")
        return
    
    # Create release with new schema
    release_data = {
        "name": "Release 2024.10",
        "description": "October 2024 release with new schema",
        "release_date": "2024-10-31T10:00:00Z",
        "status": "planned",
        "overall_scope": "Major feature release with multiple products",
        "jira_release_version": "2024.10",
        "participating_products": [product_id],  # Now uses participating_products instead of participating_squads
        "product_scopes": [
            {
                "product_id": product_id,
                "scope_description": "Enhanced user interface and new payment gateway integration",
                "poc": "john.doe@company.com",
                "current_state": "sit",
                "fixed_versions": [
                    {
                        "fixed_version": "v2.1.0", 
                        "jira_board_id": "HK-MMB-001"
                    },
                    {
                        "fixed_version": "v1.8.5",
                        "jira_board_id": "HK-MMB-002"
                    }
                ]
            }
        ]
    }
    
    print("\n📝 Creating release with new structure:")
    print(json.dumps(release_data, indent=2))
    
    response = requests.post(f"{BASE_URL}/api/v1/releases/", json=release_data)
    print(f"\n📊 Response status: {response.status_code}")
    
    if response.status_code == 200:
        release = response.json()
        print("✅ Release created successfully!")
        print(f"   Release ID: {release['_id']}")
        print(f"   Participating Products: {release.get('participating_products', [])}")
        print(f"   Product Scopes Count: {len(release.get('product_scopes', []))}")
        
        # Print product scope details
        for i, scope in enumerate(release.get('product_scopes', []), 1):
            print(f"   Product Scope {i}:")
            print(f"     - Product ID: {scope.get('product_id')}")
            print(f"     - POC: {scope.get('poc')}")
            print(f"     - Current State: {scope.get('current_state')}")
            print(f"     - Fixed Versions: {len(scope.get('fixed_versions', []))}")
            for j, fv in enumerate(scope.get('fixed_versions', []), 1):
                print(f"       {j}. {fv.get('fixed_version')} (Board: {fv.get('jira_board_id')})")
        
        return release['_id']
    else:
        print(f"❌ Failed to create release: {response.text}")
        return None

def test_get_release(release_id):
    """Test retrieving the release to verify the structure"""
    print(f"\n🔍 Retrieving release {release_id}...")
    
    response = requests.get(f"{BASE_URL}/api/v1/releases/{release_id}")
    
    if response.status_code == 200:
        release = response.json()
        print("✅ Release retrieved successfully!")
        print("\n📋 Release Structure:")
        print(json.dumps(release, indent=2, default=str))
    else:
        print(f"❌ Failed to retrieve release: {response.text}")

def main():
    """Test the new release schema"""
    print("🚀 Testing Updated Release Schema")
    print("=" * 50)
    
    # Test health first
    health_response = requests.get(f"{BASE_URL}/health")
    if health_response.status_code != 200:
        print("❌ Health check failed!")
        return
    
    print("✅ Health check passed!")
    
    # Test new release schema
    release_id = test_new_release_schema()
    
    if release_id:
        test_get_release(release_id)
    
    print("\n" + "=" * 50)
    print("🎉 Release schema testing completed!")

if __name__ == "__main__":
    main()