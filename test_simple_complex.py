#!/usr/bin/env python3
"""
Simple test for complex relationships
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_simple_product_with_jira():
    """Test creating a product with a single JIRA board"""
    print("Testing simple product with JIRA board...")
    
    product_data = {
        "name": "Simple Test Product",
        "platform": "DC",
        "jira_boards": [
            {
                "board_id": "SIMPLE-001",
                "board_name": "Simple Test Board"
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/products/", json=product_data)
    print(f"Response status: {response.status_code}")
    print(f"Response text: {response.text}")
    
    if response.status_code == 200:
        product = response.json()
        print(f"✅ Created product: {product['_id']}")
        print(f"   JIRA boards: {len(product.get('jira_boards', []))}")
        return product['_id']
    else:
        print(f"❌ Failed to create product")
        return None

def test_simple_release_with_scope():
    """Test creating a release with a simple product scope"""
    print("\nTesting simple release with product scope...")
    
    # First get a product ID
    products_response = requests.get(f"{BASE_URL}/api/v1/products/")
    if products_response.status_code == 200 and products_response.json():
        product_id = products_response.json()[0]['_id']
        
        release_data = {
            "name": "Simple Release Test",
            "description": "Test release with product scope",
            "release_date": "2024-03-15T00:00:00Z",
            "status": "planned",
            "overall_scope": "Simple test release",
            "product_scopes": [
                {
                    "product_id": product_id,
                    "scope_description": "Simple test scope for this product",
                    "fixed_versions": [
                        {"jira_board_id": "TEST-001", "fixed_version": "v1.0.0"}
                    ]
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/releases/", json=release_data)
        print(f"Response status: {response.status_code}")
        print(f"Response text: {response.text}")
        
        if response.status_code == 200:
            release = response.json()
            print(f"✅ Created release: {release['_id']}")
            print(f"   Product scopes: {len(release.get('product_scopes', []))}")
            return release['_id']
        else:
            print(f"❌ Failed to create release")
            return None
    else:
        print("❌ No products available for testing")
        return None

def main():
    """Run simple complex relationship tests"""
    print("🧪 Testing Simple Complex Relationships")
    print("=" * 50)
    
    # Test health
    health_response = requests.get(f"{BASE_URL}/health")
    if health_response.status_code != 200:
        print("❌ Health check failed!")
        return
    
    print("✅ Health check passed!")
    
    # Test simple product with JIRA
    product_id = test_simple_product_with_jira()
    
    # Test simple release with scope
    release_id = test_simple_release_with_scope()
    
    print("\n" + "=" * 50)
    print("🎉 Simple complex relationship testing completed!")
    print(f"📊 Results: Product={product_id is not None}, Release={release_id is not None}")

if __name__ == "__main__":
    main()
