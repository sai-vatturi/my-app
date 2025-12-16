from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.models.business_unit import BusinessUnit
from app.schemas.business_unit import BusinessUnitCreate, BusinessUnitUpdate
from fastapi import HTTPException

class BusinessUnitService:
    def __init__(self, db):
        self.collection = db['business_units']

    async def create_business_unit(self, unit_data: BusinessUnitCreate) -> dict:
        if await self.collection.find_one({"name": unit_data.name}):
            raise HTTPException(status_code=400, detail=f"Business Unit with name '{unit_data.name}' already exists.")

        unit = BusinessUnit(**unit_data.model_dump())
        result = await self.collection.insert_one(unit.to_dict())
        unit._id = result.inserted_id
        return self._serialize(unit.to_dict())

    async def get_business_units(self, skip: int = 0, limit: int = 100) -> List[dict]:
        cursor = self.collection.find().skip(skip).limit(limit)
        units = await cursor.to_list(length=limit)
        return [self._serialize(unit) for unit in units]

    async def get_business_unit_by_id(self, unit_id: str) -> Optional[dict]:
        try:
            unit = await self.collection.find_one({'_id': ObjectId(unit_id)})
            return self._serialize(unit) if unit else None
        except:
            return None

    async def update_business_unit(self, unit_id: str, unit_data: BusinessUnitUpdate) -> Optional[dict]:
        try:
            object_id = ObjectId(unit_id)
        except:
            return None
            
        update_data = {k: v for k, v in unit_data.model_dump(exclude_unset=True).items()}
        if not update_data:
            return await self.get_business_unit_by_id(unit_id)

        if "name" in update_data:
             name = update_data["name"]
             existing = await self.collection.find_one({"name": name})
             if existing and str(existing["_id"]) != unit_id:
                 raise HTTPException(status_code=400, detail=f"Business Unit with name '{name}' already exists.")

        update_data['updated_at'] = datetime.now(timezone.utc)
        
        result = await self.collection.update_one(
            {'_id': object_id},
            {'$set': update_data}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            return None
            
        return await self.get_business_unit_by_id(unit_id)

    async def delete_business_unit(self, unit_id: str) -> bool:
        try:
            result = await self.collection.delete_one({'_id': ObjectId(unit_id)})
            return result.deleted_count > 0
        except:
            return False

    def _serialize(self, unit: dict) -> dict:
        unit['_id'] = str(unit['_id'])
        return unit
