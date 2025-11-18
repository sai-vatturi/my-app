#!/usr/bin/env python3
"""
Test script to verify the updated release schema with validation and CHG number
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_valid_release_with_chg():
    """Test creating a release with proper product-scope linking and CHG number"""
    print("Testing valid release with CHG number and proper product-scope linking...")
    
    # Create a test product first
    product_data = {
        "name": "Test Product for Validation",
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
    
    # Create release with proper structure
    release_data = {
        "name": "Release 2024.11",
        "description": "November 2024 release with CHG number",
        "release_date": "2024-11-30T10:00:00Z",
        "status": "planned",
        "overall_scope": "Major feature release with CHG tracking",
        "jira_release_version": "2024.11",
        "chg_number": "CHG0012345",  # New CHG number field
        "participating_products": [product_id],  # Product must have corresponding scope
        "product_scopes": [
            {
                "product_id": product_id,  # Must match participating_products
                "scope_description": "Enhanced user interface and new payment gateway",
                "poc": "jane.doe@company.com",
                "current_state": "uat",
                "fixed_versions": [
                    {
                        "fixed_version": "v2.2.0", 
                        "jira_board_id": "HK-MMB-001"
                    },
                    {
                        "fixed_version": "v1.9.0",
                        "jira_board_id": "HK-MMB-002"
                    }
                ]
            }
        ]
    }
    
    print("\n📝 Creating release with valid structure:")
    print(json.dumps({k: v for k, v in release_data.items() if k != "participating_products"}, indent=2))
    print(f"   Participating Products: {release_data['participating_products']}")
    
    response = requests.post(f"{BASE_URL}/api/v1/releases/", json=release_data)
    print(f"\n📊 Response status: {response.status_code}")
    
    if response.status_code == 200:
        release = response.json()
        print("✅ Valid release created successfully!")
        print(f"   Release ID: {release['_id']}")
        print(f"   CHG Number: {release.get('chg_number', 'Not set')}")
        print(f"   JIRA Release Version: {release.get('jira_release_version', 'Not set')}")
        print(f"   Participating Products: {release.get('participating_products', [])}")
        print(f"   Product Scopes Count: {len(release.get('product_scopes', []))}")
        return release['_id']
    else:
        print(f"❌ Failed to create release: {response.text}")
        return None

def test_invalid_release_missing_scope():
    """Test validation - participating product without corresponding scope should fail"""
    print("\n🧪 Testing validation - participating product without corresponding scope...")
    
    # Create another test product
    product_data = {
        "name": "Test Product 2",
        "description": "Second test product",
        "platform": "OH",
        "country": "SG"
    }
    
    product_response = requests.post(f"{BASE_URL}/api/v1/products/", json=product_data)
    if product_response.status_code == 200:
        product_id = product_response.json()["_id"]
        print(f"✅ Created test product: {product_id}")
    else:
        print("❌ Failed to create test product")
        return
    
    # Create release with missing product scope (should fail validation)
    release_data = {
        "name": "Invalid Release Test",
        "description": "This should fail validation",
        "release_date": "2024-12-15T10:00:00Z",
        "status": "planned",
        "chg_number": "CHG0012346",
        "participating_products": [product_id, "non_existent_product"],  # Two products
        "product_scopes": [
            {
                "product_id": product_id,  # Only one scope for two products
                "scope_description": "Some scope",
                "poc": "test@company.com",
                "current_state": "dev",
                "fixed_versions": []
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/releases/", json=release_data)
    print(f"📊 Response status: {response.status_code}")
    
    if response.status_code == 422:
        print("✅ Validation correctly failed - missing product scope detected!")
        print(f"   Error details: {response.json()}")
    else:
        print(f"❌ Expected validation error, but got: {response.status_code}")
        print(f"   Response: {response.text}")

def test_release_without_optional_fields():
    """Test creating release without optional fields"""
    print("\n🧪 Testing release creation without optional fields...")
    
    # Create another test product
    product_data = {
        "name": "Test Product 3",
        "description": "Third test product",
        "platform": "DC",
        "country": "MY"
    }
    
    product_response = requests.post(f"{BASE_URL}/api/v1/products/", json=product_data)
    if product_response.status_code == 200:
        product_id = product_response.json()["_id"]
        print(f"✅ Created test product: {product_id}")
    else:
        print("❌ Failed to create test product")
        return
    
    # Create release without optional fields
    release_data = {
        "name": "Minimal Release Test",
        "release_date": "2024-12-20T10:00:00Z",
        # No jira_release_version (optional)
        # No chg_number (optional)
        # No description (optional)
        "participating_products": [product_id],
        "product_scopes": [
            {
                "product_id": product_id,
                "scope_description": "Minimal scope",
                "poc": "minimal@company.com",
                "current_state": "dev",
                "fixed_versions": [
                    {
                        "fixed_version": "v1.0.0",
                        "jira_board_id": "MIN-001"
                    }
                ]
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/releases/", json=release_data)
    print(f"📊 Response status: {response.status_code}")
    
    if response.status_code == 200:
        release = response.json()
        print("✅ Minimal release created successfully!")
        print(f"   Release ID: {release['_id']}")
        print(f"   CHG Number: {release.get('chg_number') or 'Not set (optional)'}")
        print(f"   JIRA Release Version: {release.get('jira_release_version') or 'Not set (optional)'}")
    else:
        print(f"❌ Failed to create minimal release: {response.text}")

def main():
    """Test the updated release schema with validation"""
    print("🚀 Testing Updated Release Schema with Validation")
    print("=" * 60)
    
    # Test health first
    health_response = requests.get(f"{BASE_URL}/health")
    if health_response.status_code != 200:
        print("❌ Health check failed!")
        return
    
    print("✅ Health check passed!")
    
    # Test valid release
    valid_release_id = test_valid_release_with_chg()
    
    # Test invalid release (should fail validation)
    test_invalid_release_missing_scope()
    
    # Test minimal release without optional fields
    test_release_without_optional_fields()
    
    print("\n" + "=" * 60)
    print("🎉 Release schema validation testing completed!")

if __name__ == "__main__":
    main()