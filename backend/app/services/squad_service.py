from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId

from app.schemas.squad import SquadCreate, SquadUpdate
from app.models.squad import Squad
from app.core import utils

class SquadService:
    def __init__(self, db):
        self.db = db
        self.collection = db.squads

    async def get_squads(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all squads with pagination"""
        cursor = self.collection.find().skip(skip).limit(limit)
        squads = []
        async for squad in cursor:
            squads.append(squad)
        return squads

    async def get_squad_by_id(self, squad_id: str) -> Optional[dict]:
        """Get a specific squad by ID"""
        squad = await self.collection.find_one({"_id": ObjectId(squad_id)})
        return squad

    async def create_squad(self, squad_data: SquadCreate) -> dict:
        """Create a new squad and update related products"""
        squad = Squad(
            name=squad_data.name,
            description=squad_data.description,
            team_leads=squad_data.team_leads,
            principal_engineers=squad_data.principal_engineers,
            products=squad_data.products,
            business_unit_id=squad_data.business_unit_id
        )
        
        result = await self.collection.insert_one(squad.to_dict())
        created_squad = await self.collection.find_one({"_id": result.inserted_id})
        squad_id = str(created_squad["_id"])
        
        # Update products to include this squad (two-way relationship)
        if squad_data.products:
            await utils.update_relationship(
                self.db,
                "products",
                squad_id,
                "squads",
                set(),
                set(squad_data.products)
            )
        
        return created_squad

    async def update_squad(self, squad_id: str, squad_data: SquadUpdate) -> Optional[dict]:
        """Update an existing squad and maintain two-way relationship with products"""
        existing_squad = await self.collection.find_one({"_id": ObjectId(squad_id)})
        if not existing_squad:
            return None
        
        old_products = set(existing_squad.get("products", []))
        update_data = squad_data.model_dump(exclude_none=True)
        new_products = set(update_data.get("products", old_products)) if "products" in update_data else old_products
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"_id": ObjectId(squad_id)},
                {"$set": update_data}
            )
        
        # Update product relationships (two-way)
        await utils.update_relationship(
            self.db,
            "products",
            squad_id,
            "squads",
            set(old_products),
            set(new_products)
        )
        
        updated_squad = await self.collection.find_one({"_id": ObjectId(squad_id)})
        return updated_squad

    async def delete_squad(self, squad_id: str) -> bool:
        """Delete a squad and remove it from related products"""
        squad = await self.collection.find_one({"_id": ObjectId(squad_id)})
        if squad:
            # Remove squad from all associated products
            products = set(squad.get("products", []))
            await utils.update_relationship(
                self.db,
                "products",
                squad_id,
                "squads",
                products,
                set()
            )
        
        result = await self.collection.delete_one({"_id": ObjectId(squad_id)})
        return result.deleted_count > 0
