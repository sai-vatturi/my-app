#!/usr/bin/env python3
"""
Test script to verify complex relationships in the Release Management Portal
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_create_products_with_multiple_boards():
    """Test creating products with multiple JIRA boards"""
    print("Testing product creation with multiple JIRA boards...")
    
    # Create HK-MMB product with multiple boards
    hk_mmb_data = {
        "name": "HK-MMB",
        "description": "Hong Kong MMB product",
        "platform": "DC",
        "country": "HK",
        "product_owner": "Alice Johnson",
        "technical_lead": "Bob Wilson",
        "jira_boards": [
            {"board_id": "HK-MMB-001", "board_name": "HK-MMB Main Board", "fixed_version": "v2.1.0"},
            {"board_id": "HK-MMB-002", "board_name": "HK-MMB Integration", "fixed_version": "v1.5.0"}
        ],
        "squads": []
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/products/", json=hk_mmb_data)
    print(f"HK-MMB creation: {response.status_code}")
    if response.status_code == 200:
        hk_mmb = response.json()
        print(f"Created HK-MMB: {hk_mmb['_id']}")
        return hk_mmb['_id']
    return None

def test_create_my_sme_product():
    """Test creating MY-SME product"""
    print("\nTesting MY-SME product creation...")
    
    my_sme_data = {
        "name": "MY-SME",
        "description": "Malaysia SME product",
        "platform": "OH",
        "country": "MY",
        "product_owner": "Charlie Brown",
        "technical_lead": "Diana Prince",
        "jira_boards": [
            {"board_id": "MY-SME-001", "board_name": "MY-SME Frontend", "fixed_version": "v3.0.0"},
            {"board_id": "MY-SME-002", "board_name": "MY-SME Backend", "fixed_version": "v2.8.0"}
        ],
        "squads": []
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/products/", json=my_sme_data)
    print(f"MY-SME creation: {response.status_code}")
    if response.status_code == 200:
        my_sme = response.json()
        print(f"Created MY-SME: {my_sme['_id']}")
        return my_sme['_id']
    return None

def test_create_release_with_product_scopes():
    """Test creating a release with multiple products and individual scopes"""
    print("\nTesting release creation with product scopes...")
    
    release_data = {
        "name": "Release 2024.2",
        "description": "February 2024 release with multiple products",
        "release_date": "2024-02-15T00:00:00Z",
        "status": "planned",
        "overall_scope": "Major feature updates and performance improvements across all products",
        "jira_release_version": "2024.2",
        "participating_squads": ["Squad Alpha", "Squad Beta"],
        "product_scopes": [
            {
                "product_id": "placeholder_hk_mmb",  # Will be replaced with actual ID
                "scope_description": "HK-MMB: New payment gateway integration and UI enhancements",
                "fixed_versions": [
                    {"jira_board_id": "HK-MMB-001", "fixed_version": "v2.1.0"},
                    {"jira_board_id": "HK-MMB-002", "fixed_version": "v1.5.0"}
                ]
            },
            {
                "product_id": "placeholder_my_sme",  # Will be replaced with actual ID
                "scope_description": "MY-SME: Enhanced reporting features and mobile optimization",
                "fixed_versions": [
                    {"jira_board_id": "MY-SME-001", "fixed_version": "v3.0.0"},
                    {"jira_board_id": "MY-SME-002", "fixed_version": "v2.8.0"}
                ]
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/releases/", json=release_data)
    print(f"Release creation: {response.status_code}")
    if response.status_code == 200:
        release = response.json()
        print(f"Created release: {release['_id']}")
        return release['_id']
    return None

def test_create_runbooks_for_products():
    """Test creating runbooks that apply to multiple products"""
    print("\nTesting runbook creation for multiple products...")
    
    # Get the release ID first
    releases_response = requests.get(f"{BASE_URL}/api/v1/releases/")
    if releases_response.status_code == 200 and releases_response.json():
        release_id = releases_response.json()[0]['_id']
        
        # Create DC platform runbook
        dc_runbook_data = {
            "release_id": release_id,
            "application_name": "DC Platform",
            "build_version": "2.1.0",
            "release_version": "2024.2",
            "product_ids": ["placeholder_hk_mmb"],  # Will be replaced
            "point_of_contact": {
                "PE": "John Doe",
                "PO": "Jane Smith"
            },
            "change_request_details": "CR-2024-001: DC Platform deployment",
            "cab_approval_status": "pending",
            "pre_deployment_activities": [
                {"activity": "Database backup", "owner": "DBA Team", "duration": "2 hours"},
                {"activity": "Environment preparation", "owner": "DevOps", "duration": "1 hour"}
            ],
            "post_deployment_activities": [
                {"activity": "Smoke testing", "owner": "QA Team", "duration": "1 hour"},
                {"activity": "Performance monitoring", "owner": "SRE Team", "duration": "2 hours"}
            ],
            "deployment_steps": [
                {"step": "Stop application services", "owner": "DevOps", "estimated_time": "15 min"},
                {"step": "Deploy new build", "owner": "DevOps", "estimated_time": "30 min"},
                {"step": "Start application services", "owner": "DevOps", "estimated_time": "15 min"}
            ],
            "resources": ["DevOps Team", "DBA Team", "QA Team", "SRE Team"],
            "external_team_details": "Coordination with infrastructure team required"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/runbooks/", json=dc_runbook_data)
        print(f"DC Runbook creation: {response.status_code}")
        if response.status_code == 200:
            print(f"Created DC runbook: {response.json()['_id']}")
        
        # Create OH platform runbook
        oh_runbook_data = {
            "release_id": release_id,
            "application_name": "OH Platform",
            "build_version": "3.0.0",
            "release_version": "2024.2",
            "product_ids": ["placeholder_my_sme"],  # Will be replaced
            "point_of_contact": {
                "PE": "Alice Johnson",
                "PO": "Bob Wilson"
            },
            "change_request_details": "CR-2024-002: OH Platform deployment",
            "cab_approval_status": "pending",
            "pre_deployment_activities": [
                {"activity": "Frontend build verification", "owner": "Frontend Team", "duration": "1 hour"},
                {"activity": "Backend service health check", "owner": "Backend Team", "duration": "30 min"}
            ],
            "post_deployment_activities": [
                {"activity": "UI regression testing", "owner": "QA Team", "duration": "2 hours"},
                {"activity": "API endpoint validation", "owner": "QA Team", "duration": "1 hour"}
            ],
            "deployment_steps": [
                {"step": "Deploy frontend assets", "owner": "DevOps", "estimated_time": "20 min"},
                {"step": "Deploy backend services", "owner": "DevOps", "estimated_time": "25 min"},
                {"step": "Update load balancer config", "owner": "DevOps", "estimated_time": "10 min"}
            ],
            "resources": ["Frontend Team", "Backend Team", "DevOps Team", "QA Team"],
            "external_team_details": "CDN cache invalidation required"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/runbooks/", json=oh_runbook_data)
        print(f"OH Runbook creation: {response.status_code}")
        if response.status_code == 200:
            print(f"Created OH runbook: {response.json()['_id']}")

def test_get_all_data():
    """Test getting all data to verify relationships"""
    print("\nTesting GET endpoints with new structure...")
    
    endpoints = ["products", "releases", "runbooks"]
    
    for endpoint in endpoints:
        response = requests.get(f"{BASE_URL}/api/v1/{endpoint}/")
        print(f"GET /{endpoint}: {response.status_code} - {len(response.json())} items")
        
        if response.status_code == 200 and response.json():
            data = response.json()[0]
            print(f"  Sample {endpoint} structure:")
            if endpoint == "products":
                print(f"    - Name: {data.get('name')}")
                print(f"    - JIRA Boards: {len(data.get('jira_boards', []))}")
                for board in data.get('jira_boards', []):
                    print(f"      * {board.get('board_name')} (v{board.get('fixed_version')})")
            elif endpoint == "releases":
                print(f"    - Name: {data.get('name')}")
                print(f"    - Overall Scope: {data.get('overall_scope', 'N/A')}")
                print(f"    - Product Scopes: {len(data.get('product_scopes', []))}")
                for scope in data.get('product_scopes', []):
                    print(f"      * Product: {scope.get('product_id')}")
                    print(f"      * Scope: {scope.get('scope_description')}")
                    print(f"      * Fixed Versions: {len(scope.get('fixed_versions', []))}")
            elif endpoint == "runbooks":
                print(f"    - Application: {data.get('application_name')}")
                print(f"    - Products: {len(data.get('product_ids', []))}")
                print(f"    - Build Version: {data.get('build_version')}")

def main():
    """Run all complex relationship tests"""
    print("🚀 Testing Complex Relationships in Release Management Portal")
    print("=" * 70)
    
    # Test health first
    health_response = requests.get(f"{BASE_URL}/health")
    if health_response.status_code != 200:
        print("❌ Health check failed!")
        return
    
    print("✅ Health check passed!")
    
    # Test creating products with multiple JIRA boards
    hk_mmb_id = test_create_products_with_multiple_boards()
    my_sme_id = test_create_my_sme_product()
    
    # Test creating release with product scopes
    release_id = test_create_release_with_product_scopes()
    
    # Test creating runbooks for multiple products
    test_create_runbooks_for_products()
    
    # Test getting all data
    test_get_all_data()
    
    print("\n" + "=" * 70)
    print("🎉 Complex relationship testing completed!")
    print(f"📊 Created: HK-MMB={hk_mmb_id is not None}, MY-SME={my_sme_id is not None}, Release={release_id is not None}")

if __name__ == "__main__":
    main()
