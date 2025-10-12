from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId

from app.schemas.squad import SquadCreate, SquadUpdate
from app.models.squad import Squad

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
        """Create a new squad"""
        squad = Squad(
            name=squad_data.name,
            description=squad_data.description,
            jira_board_id=squad_data.jira_board_id,
            team_lead=squad_data.team_lead,
            product_owner=squad_data.product_owner,
            products=squad_data.products
        )
        
        result = await self.collection.insert_one(squad.to_dict())
        created_squad = await self.collection.find_one({"_id": result.inserted_id})
        return created_squad

    async def update_squad(self, squad_id: str, squad_data: SquadUpdate) -> Optional[dict]:
        """Update an existing squad"""
        update_data = squad_data.model_dump(exclude_none=True)
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"_id": ObjectId(squad_id)},
                {"$set": update_data}
            )
        
        updated_squad = await self.collection.find_one({"_id": ObjectId(squad_id)})
        return updated_squad

    async def delete_squad(self, squad_id: str) -> bool:
        """Delete a squad"""
        result = await self.collection.delete_one({"_id": ObjectId(squad_id)})
        return result.deleted_count > 0
