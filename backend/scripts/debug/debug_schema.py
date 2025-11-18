#!/usr/bin/env python3
"""
Debug script to test schema validation
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.schemas.product import ProductCreate, JiraBoardInfo

# Test JiraBoardInfo schema
print("Testing JiraBoardInfo schema...")
try:
    board_info = JiraBoardInfo(
        board_id="TEST-001",
        board_name="Test Board",
        fixed_version="v1.0.0"
    )
    print(f"✅ JiraBoardInfo created: {board_info}")
except Exception as e:
    print(f"❌ JiraBoardInfo error: {e}")

# Test ProductCreate schema with JIRA boards
print("\nTesting ProductCreate schema with JIRA boards...")
try:
    product_data = {
        "name": "Test Product",
        "platform": "DC",
        "jira_boards": [
            {
                "board_id": "TEST-001",
                "board_name": "Test Board",
                "fixed_version": "v1.0.0"
            }
        ]
    }
    
    product = ProductCreate(**product_data)
    print(f"✅ ProductCreate created: {product}")
    print(f"   JIRA boards: {product.jira_boards}")
except Exception as e:
    print(f"❌ ProductCreate error: {e}")
    import traceback
    traceback.print_exc()
