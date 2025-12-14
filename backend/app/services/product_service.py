from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId

from app.schemas.product import ProductCreate, ProductUpdate
from app.models.product import Product
from app.core import utils

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
        """Create a new product and update related squads"""
        # Convert JiraBoardInfo objects to dictionaries
        jira_boards_dicts = [board.model_dump() for board in product_data.jira_boards] if product_data.jira_boards else []
        
        product = Product(
            name=product_data.name,
            description=product_data.description,
            product_owners=product_data.product_owners,
            team_leads=product_data.team_leads,
            principal_engineers=product_data.principal_engineers,
            jira_boards=jira_boards_dicts,
            squads=product_data.squads
        )
        
        result = await self.collection.insert_one(product.to_dict())
        created_product = await self.collection.find_one({"_id": result.inserted_id})
        product_id = str(created_product["_id"])
        
        # Update squads to include this product (two-way relationship)
        # Update squads to include this product (two-way relationship)
        if product_data.squads:
             await utils.update_relationship(
                self.db,
                "squads",
                product_id,
                "products",
                set(),
                set(product_data.squads)
            )
        
        return created_product

    async def update_product(self, product_id: str, product_data: ProductUpdate) -> Optional[dict]:
        """Update an existing product and maintain two-way relationship with squads"""
        existing_product = await self.collection.find_one({"_id": ObjectId(product_id)})
        if not existing_product:
            return None
        
        old_squads = set(existing_product.get("squads", []))
        update_data = product_data.model_dump(exclude_none=True)
        
        if "jira_boards" in update_data and update_data["jira_boards"] is not None:
            update_data["jira_boards"] = [
                board.model_dump() if hasattr(board, "model_dump") else board
                for board in update_data["jira_boards"]
            ]
        
        new_squads = set(update_data.get("squads", old_squads)) if "squads" in update_data else old_squads
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": update_data}
            )
        
        # Update squad relationships (two-way)
        await utils.update_relationship(
            self.db,
            "squads",
            product_id,
            "products",
            set(old_squads),
            set(new_squads)
        )
        
        updated_product = await self.collection.find_one({"_id": ObjectId(product_id)})
        return updated_product

    async def delete_product(self, product_id: str) -> bool:
        """Delete a product and remove it from related squads"""
        product = await self.collection.find_one({"_id": ObjectId(product_id)})
        if product:
            # Remove product from all associated squads
            # Remove product from all associated squads
            squads = set(product.get("squads", []))
            await utils.update_relationship(
                self.db,
                "squads",
                product_id,
                "products",
                squads,
                set()
            )
        
        result = await self.collection.delete_one({"_id": ObjectId(product_id)})
        return result.deleted_count > 0
