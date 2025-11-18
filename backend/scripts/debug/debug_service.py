#!/usr/bin/env python3
"""
Debug script to test service layer
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.schemas.product import ProductCreate
from app.services.product_service import ProductService
from app.core.database import connect_to_mongo
import asyncio

async def test_product_service():
    """Test the product service directly"""
    print("Testing ProductService...")
    
    # Connect to database
    await connect_to_mongo()
    
    # Create service
    from app.core.database import db
    service = ProductService(db)
    
    # Test product creation
    product_data = ProductCreate(
        name="Test Product",
        platform="DC",
        jira_boards=[
            {
                "board_id": "TEST-001",
                "board_name": "Test Board",
                "fixed_version": "v1.0.0"
            }
        ]
    )
    
    try:
        result = await service.create_product(product_data)
        print(f"✅ Product created: {result}")
    except Exception as e:
        print(f"❌ Product creation error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_product_service())
