from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.product import ProductCreate, ProductUpdate
from app.models.product import Product

class ProductService:
    def __init__(self, db):
        self.db = db
        self.collection = db.products

    async def get_products(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all products with pagination"""
        cursor = self.collection.find().skip(skip).limit(limit)
        products = []
        async for product in cursor:
            products.append(product)
        return products

    async def get_product_by_id(self, product_id: str) -> Optional[dict]:
        """Get a specific product by ID"""
        product = await self.collection.find_one({"_id": ObjectId(product_id)})
        return product

    async def create_product(self, product_data: ProductCreate) -> dict:
        """Create a new product"""
        # Convert JiraBoardInfo objects to dictionaries
        jira_boards_dicts = [board.dict() for board in product_data.jira_boards] if product_data.jira_boards else []
        
        product = Product(
            name=product_data.name,
            description=product_data.description,
            platform=product_data.platform,
            country=product_data.country,
            product_owner=product_data.product_owner,
            technical_lead=product_data.technical_lead,
            jira_boards=jira_boards_dicts,
            squads=product_data.squads
        )
        
        result = await self.collection.insert_one(product.to_dict())
        created_product = await self.collection.find_one({"_id": result.inserted_id})
        return created_product

    async def update_product(self, product_id: str, product_data: ProductUpdate) -> Optional[dict]:
        """Update an existing product"""
        update_data = {k: v for k, v in product_data.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await self.collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": update_data}
            )
        
        updated_product = await self.collection.find_one({"_id": ObjectId(product_id)})
        return updated_product

    async def delete_product(self, product_id: str) -> bool:
        """Delete a product"""
        result = await self.collection.delete_one({"_id": ObjectId(product_id)})
        return result.deleted_count > 0
