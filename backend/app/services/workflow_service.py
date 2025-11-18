from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId

from app.models.workflow import Workflow, WorkflowStage
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate

class WorkflowService:
    def __init__(self, db):
        self.db = db
        self.collection = db.workflows

    async def get_workflows(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all workflows with pagination"""
        cursor = self.collection.find().skip(skip).limit(limit)
        workflows = []
        async for workflow in cursor:
            workflows.append(workflow)
        return workflows

    async def get_workflow_by_id(self, workflow_id: str) -> Optional[dict]:
        """Get a specific workflow by ID"""
        workflow = await self.collection.find_one({"_id": ObjectId(workflow_id)})
        return workflow

    async def create_workflow(self, workflow_data: WorkflowCreate) -> dict:
        """Create a new workflow"""
        # Sort stages by order
        sorted_stages = sorted(workflow_data.stages, key=lambda x: x.order)

        workflow = Workflow(
            name=workflow_data.name,
            description=workflow_data.description,
            stages=[WorkflowStage(**stage.model_dump()) for stage in sorted_stages]
        )

        result = await self.collection.insert_one(workflow.to_dict())
        created_workflow = await self.collection.find_one({"_id": result.inserted_id})
        return created_workflow

    async def update_workflow(self, workflow_id: str, workflow_data: WorkflowUpdate) -> Optional[dict]:
        """Update an existing workflow"""
        update_data = {}

        if workflow_data.name is not None:
            update_data["name"] = workflow_data.name
        if workflow_data.description is not None:
            update_data["description"] = workflow_data.description
        if workflow_data.stages is not None:
            # Sort stages by order
            sorted_stages = sorted(workflow_data.stages, key=lambda x: x.order)
            update_data["stages"] = [stage.model_dump() for stage in sorted_stages]

        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"_id": ObjectId(workflow_id)},
                {"$set": update_data}
            )

        updated_workflow = await self.collection.find_one({"_id": ObjectId(workflow_id)})
        return updated_workflow

    async def delete_workflow(self, workflow_id: str) -> bool:
        """Delete a workflow"""
        result = await self.collection.delete_one({"_id": ObjectId(workflow_id)})
        return result.deleted_count > 0
