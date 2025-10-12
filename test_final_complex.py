#!/usr/bin/env python3
"""
Final comprehensive test for complex relationships
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_complete_workflow():
    """Test the complete workflow with all complex relationships"""
    print("🚀 Testing Complete Complex Workflow")
    print("=" * 60)
    
    # Step 1: Create products with multiple JIRA boards
    print("\n📦 Step 1: Creating Products with Multiple JIRA Boards")
    
    # Create HK-MMB product
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
    hk_mmb_id = response.json()["_id"] if response.status_code == 200 else None
    print(f"✅ HK-MMB created: {hk_mmb_id}")
    
    # Create MY-SME product
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
    my_sme_id = response.json()["_id"] if response.status_code == 200 else None
    print(f"✅ MY-SME created: {my_sme_id}")
    
    # Step 2: Create release with multiple products and individual scopes
    print("\n🚀 Step 2: Creating Release with Product Scopes")
    
    release_data = {
        "name": "Release 2024.3",
        "description": "March 2024 release with complex relationships",
        "release_date": "2024-03-15T00:00:00Z",
        "status": "planned",
        "overall_scope": "Major feature updates and performance improvements across all products",
        "jira_release_version": "2024.3",
        "participating_squads": ["Squad Alpha", "Squad Beta"],
        "product_scopes": [
            {
                "product_id": hk_mmb_id,
                "scope_description": "HK-MMB: New payment gateway integration and UI enhancements",
                "fixed_versions": [
                    {"jira_board_id": "HK-MMB-001", "fixed_version": "v2.1.0"},
                    {"jira_board_id": "HK-MMB-002", "fixed_version": "v1.5.0"}
                ]
            },
            {
                "product_id": my_sme_id,
                "scope_description": "MY-SME: Enhanced reporting features and mobile optimization",
                "fixed_versions": [
                    {"jira_board_id": "MY-SME-001", "fixed_version": "v3.0.0"},
                    {"jira_board_id": "MY-SME-002", "fixed_version": "v2.8.0"}
                ]
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/releases/", json=release_data)
    release_id = response.json()["_id"] if response.status_code == 200 else None
    print(f"✅ Release created: {release_id}")
    
    # Step 3: Create runbooks for multiple products
    print("\n📋 Step 3: Creating Runbooks for Multiple Products")
    
    # DC Platform runbook (applies to HK-MMB)
    dc_runbook_data = {
        "release_id": release_id,
        "application_name": "DC Platform",
        "build_version": "2.1.0",
        "release_version": "2024.3",
        "product_ids": [hk_mmb_id],
        "point_of_contact": {
            "PE": "John Doe",
            "PO": "Jane Smith"
        },
        "change_request_details": "CR-2024-003: DC Platform deployment",
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
    dc_runbook_id = response.json()["_id"] if response.status_code == 200 else None
    print(f"✅ DC Runbook created: {dc_runbook_id}")
    
    # OH Platform runbook (applies to MY-SME)
    oh_runbook_data = {
        "release_id": release_id,
        "application_name": "OH Platform",
        "build_version": "3.0.0",
        "release_version": "2024.3",
        "product_ids": [my_sme_id],
        "point_of_contact": {
            "PE": "Alice Johnson",
            "PO": "Bob Wilson"
        },
        "change_request_details": "CR-2024-004: OH Platform deployment",
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
    oh_runbook_id = response.json()["_id"] if response.status_code == 200 else None
    print(f"✅ OH Runbook created: {oh_runbook_id}")
    
    # Step 4: Verify all relationships
    print("\n🔍 Step 4: Verifying All Relationships")
    
    # Get all data and verify relationships
    products_response = requests.get(f"{BASE_URL}/api/v1/products/")
    releases_response = requests.get(f"{BASE_URL}/api/v1/releases/")
    runbooks_response = requests.get(f"{BASE_URL}/api/v1/runbooks/")
    
    print(f"📊 Total Products: {len(products_response.json())}")
    print(f"📊 Total Releases: {len(releases_response.json())}")
    print(f"📊 Total Runbooks: {len(runbooks_response.json())}")
    
    # Find our created release and verify its structure
    releases = releases_response.json()
    our_release = next((r for r in releases if r["_id"] == release_id), None)
    
    if our_release:
        print(f"\n🎯 Release Analysis:")
        print(f"   Name: {our_release['name']}")
        print(f"   Overall Scope: {our_release['overall_scope']}")
        print(f"   Product Scopes: {len(our_release['product_scopes'])}")
        
        for scope in our_release['product_scopes']:
            print(f"     - Product ID: {scope['product_id']}")
            print(f"     - Scope: {scope['scope_description']}")
            print(f"     - Fixed Versions: {len(scope['fixed_versions'])}")
    
    # Find our runbooks and verify their structure
    runbooks = runbooks_response.json()
    our_runbooks = [r for r in runbooks if r["release_id"] == release_id]
    
    print(f"\n📋 Runbook Analysis:")
    for runbook in our_runbooks:
        print(f"   Application: {runbook['application_name']}")
        print(f"   Products: {len(runbook['product_ids'])}")
        print(f"   Build Version: {runbook['build_version']}")
        print(f"   CAB Status: {runbook['cab_approval_status']}")
    
    print("\n" + "=" * 60)
    print("🎉 Complete Complex Workflow Test Completed!")
    print(f"✅ Created: HK-MMB={hk_mmb_id is not None}, MY-SME={my_sme_id is not None}")
    print(f"✅ Created: Release={release_id is not None}")
    print(f"✅ Created: DC Runbook={dc_runbook_id is not None}, OH Runbook={oh_runbook_id is not None}")

if __name__ == "__main__":
    test_complete_workflow()
