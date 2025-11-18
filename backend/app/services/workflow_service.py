from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import HTTPException

from app.schemas.workflow import (
    WorkflowTemplateCreate,
    WorkflowTemplateUpdate,
    WorkflowStage,
)


class WorkflowService:
    def __init__(self, db):
        self.db = db
        self.collection = db.release_workflows

    async def ensure_default_workflows(self) -> None:
        """Seed default workflows if they are missing."""
        existing_default = await self.collection.count_documents({"is_default": True})
        if existing_default:
            return

        defaults = self._default_workflows()
        timestamps = datetime.now(timezone.utc)

        for workflow in defaults:
            workflow_doc = {
                **workflow,
                "is_default": True,
                "created_at": timestamps,
                "updated_at": timestamps,
            }
            await self.collection.insert_one(workflow_doc)

    async def get_workflows(self, release_type: Optional[str] = None) -> List[dict]:
        query = {}
        if release_type:
            query["release_type"] = release_type

        cursor = self.collection.find(query).sort("release_type", 1)
        workflows = []
        async for workflow in cursor:
            workflows.append(workflow)
        return workflows

    async def get_workflow_by_id(self, workflow_id: str) -> Optional[dict]:
        return await self.collection.find_one({"_id": ObjectId(workflow_id)})

    async def get_workflow_by_release_type(self, release_type: str) -> Optional[dict]:
        return await self.collection.find_one({"release_type": release_type})

    async def create_workflow(self, workflow_data: WorkflowTemplateCreate) -> dict:
        existing = await self.get_workflow_by_release_type(workflow_data.release_type)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Workflow already exists for release_type '{workflow_data.release_type}'",
            )

        workflow_doc = workflow_data.model_dump()
        workflow_doc["created_at"] = datetime.now(timezone.utc)
        workflow_doc["updated_at"] = workflow_doc["created_at"]

        result = await self.collection.insert_one(workflow_doc)
        return await self.collection.find_one({"_id": result.inserted_id})

    async def update_workflow(
        self, workflow_id: str, workflow_data: WorkflowTemplateUpdate
    ) -> dict:
        workflow = await self.get_workflow_by_id(workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        update_payload = workflow_data.model_dump(exclude_none=True)

        if "release_type" in update_payload:
            existing = await self.get_workflow_by_release_type(update_payload["release_type"])
            if existing and str(existing["_id"]) != str(workflow_id):
                raise HTTPException(
                    status_code=400,
                    detail=f"Workflow already exists for release_type '{update_payload['release_type']}'",
                )

        if update_payload:
            update_payload["updated_at"] = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"_id": ObjectId(workflow_id)},
                {"$set": update_payload},
            )

        return await self.get_workflow_by_id(workflow_id)

    async def delete_workflow(self, workflow_id: str) -> None:
        workflow = await self.get_workflow_by_id(workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        if workflow.get("is_default"):
            raise HTTPException(
                status_code=400,
                detail="Default workflows cannot be deleted",
            )

        await self.collection.delete_one({"_id": ObjectId(workflow_id)})

    def _default_workflows(self) -> List[dict]:
        """Return the built-in workflow templates."""
        return [
            {
                "name": "Major Release Workflow",
                "release_type": "Major release",
                "stages": [
                    self._stage("Scope Freeze", 1, True, True, 30),
                    self._stage("Development Complete", 2, False, False, 21),
                    self._stage("SIT Sign-off", 3, True, True, 14),
                    self._stage("UAT Sign-off", 4, True, False, 7),
                    self._stage("Deployment Readiness", 5, False, False, 3),
                    self._stage("Go-Live", 6, False, False, 0),
                ],
            },
            {
                "name": "Data Patch Release Workflow",
                "release_type": "Data patch",
                "stages": [
                    self._stage("Data Validation", 1, True, True, 10),
                    self._stage("Patch Build", 2, False, False, 7),
                    self._stage("SIT Verification", 3, False, False, 5),
                    self._stage("Production Approval", 4, True, True, 2),
                    self._stage("Patch Deployment", 5, False, False, 0),
                ],
            },
            {
                "name": "Hotfix Release Workflow",
                "release_type": "Hotfix",
                "stages": [
                    self._stage("Issue Confirmation", 1, False, False, 3),
                    self._stage("Fix Development", 2, False, False, 2),
                    self._stage("QA Validation", 3, True, False, 1),
                    self._stage("CAB Approval", 4, True, True, 0),
                    self._stage("Production Release", 5, False, False, 0),
                ],
            },
        ]

    def _stage(
        self,
        name: str,
        order: int,
        requires_attachment: bool,
        attachment_mandatory: bool,
        default_days_before_release: int,
        description: Optional[str] = None,
    ) -> dict:
        stage = WorkflowStage(
            name=name,
            order=order,
            requires_attachment=requires_attachment,
            attachment_mandatory=attachment_mandatory,
            default_days_before_release=default_days_before_release,
            description=description,
        )
        return stage.model_dump()

