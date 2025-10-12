from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.runbook import RunbookCreate, RunbookUpdate
from app.models.runbook import Runbook

class RunbookService:
    def __init__(self, db):
        self.db = db
        self.collection = db.runbooks

    async def get_runbooks(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all runbooks with pagination"""
        cursor = self.collection.find().skip(skip).limit(limit)
        runbooks = []
        async for runbook in cursor:
            runbooks.append(runbook)
        return runbooks

    async def get_runbook_by_id(self, runbook_id: str) -> Optional[dict]:
        """Get a specific runbook by ID"""
        runbook = await self.collection.find_one({"_id": ObjectId(runbook_id)})
        return runbook

    async def create_runbook(self, runbook_data: RunbookCreate) -> dict:
        """Create a new runbook"""
        runbook = Runbook(
            release_id=runbook_data.release_id,
            application_name=runbook_data.application_name,
            build_version=runbook_data.build_version,
            release_version=runbook_data.release_version,
            product_ids=runbook_data.product_ids,  # This is already a list of strings
            point_of_contact=runbook_data.point_of_contact,
            change_request_details=runbook_data.change_request_details,
            cab_approval_status=runbook_data.cab_approval_status,
            pre_deployment_activities=runbook_data.pre_deployment_activities,
            post_deployment_activities=runbook_data.post_deployment_activities,
            deployment_steps=runbook_data.deployment_steps,
            resources=runbook_data.resources,
            external_team_details=runbook_data.external_team_details
        )
        
        result = await self.collection.insert_one(runbook.to_dict())
        created_runbook = await self.collection.find_one({"_id": result.inserted_id})
        return created_runbook

    async def update_runbook(self, runbook_id: str, runbook_data: RunbookUpdate) -> Optional[dict]:
        """Update an existing runbook"""
        update_data = {k: v for k, v in runbook_data.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await self.collection.update_one(
                {"_id": ObjectId(runbook_id)},
                {"$set": update_data}
            )
        
        updated_runbook = await self.collection.find_one({"_id": ObjectId(runbook_id)})
        return updated_runbook

    async def delete_runbook(self, runbook_id: str) -> bool:
        """Delete a runbook"""
        result = await self.collection.delete_one({"_id": ObjectId(runbook_id)})
        return result.deleted_count > 0
