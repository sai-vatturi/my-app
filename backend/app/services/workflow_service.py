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

    # ========== Workflow State Management Methods ==========
    
    @staticmethod
    def parse_datetime(dt_value) -> Optional[datetime]:
        """Parse datetime from string or return datetime as-is. Ensures UTC timezone."""
        if dt_value is None:
            return None
        if isinstance(dt_value, datetime):
            return dt_value.replace(tzinfo=timezone.utc) if dt_value.tzinfo is None else dt_value
        if isinstance(dt_value, str):
            try:
                dt = datetime.fromisoformat(dt_value.replace("Z", "+00:00"))
                return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
            except ValueError:
                return None
        return None

    def blank_stage_state(self, deadline: Optional[datetime] = None) -> dict:
        """Create a blank stage state with optional deadline."""
        deadline_str = None
        if deadline:
            deadline_str = deadline.isoformat() if isinstance(deadline, datetime) else str(deadline)
        return {
            "status": False,
            "completed_at": None,
            "attachment_id": None,
            "attachment_filename": None,
            "attachment_uploaded_at": None,
            "attachments": [],
            "deadline": deadline_str,
        }

    def build_state_template(self, workflow: dict, release_date) -> dict:
        """Build workflow state template for a release based on workflow stages."""
        from app.core import utils
        template = {}
        release_date = self.parse_datetime(release_date)
        
        for stage in sorted(workflow.get("stages", []), key=lambda s: s["order"]):
            days_before = stage.get("default_days_before_release", 0)
            deadline = None
            if release_date and days_before >= 0:
                deadline = utils.calculate_deadline(release_date, days_before)
            template[str(stage["order"])] = self.blank_stage_state(deadline=deadline)
        return template

    def ensure_product_states(self, product: dict, workflow: dict, release_date: Optional[datetime] = None) -> tuple:
        """Ensure product has workflow states for all stages. Returns (states, changed)."""
        from app.core import utils
        states = product.get("workflow_states")
        changed = False

        if not states:
            states = self.build_state_template(workflow, release_date or utils.get_utc_now())
            product["workflow_states"] = states
            changed = True
        else:
            for stage in workflow.get("stages", []):
                key = str(stage["order"])
                if key not in states:
                    days_before = stage.get("default_days_before_release", 0)
                    deadline = None
                    if release_date and isinstance(release_date, datetime) and days_before > 0:
                        deadline = utils.calculate_deadline(release_date, days_before)
                    states[key] = self.blank_stage_state(deadline=deadline)
                    changed = True
        return states, changed

    def determine_next_stage(self, workflow: dict, states: dict) -> Optional[dict]:
        """Determine the next pending stage in the workflow."""
        for stage in sorted(workflow.get("stages", []), key=lambda s: s["order"]):
            state = states.get(str(stage["order"]))
            if not state or not state.get("status"):
                return stage
        return None

    def get_stage_by_order(self, workflow: dict, order: int) -> Optional[dict]:
        """Get a stage from workflow by its order number."""
        return next((s for s in workflow.get("stages", []) if s.get("order") == order), None)

    def calculate_release_status(self, products: list, workflow: dict) -> str:
        """Calculate release status based on product workflow states."""
        from app.core import utils
        
        if not products:
            return "planned"
            
        sorted_stages = sorted(workflow.get("stages", []), key=lambda s: s["order"])
        if not sorted_stages:
            return "planned"
            
        last_stage_order = str(sorted_stages[-1]["order"])
        
        # Check completion
        all_completed = all(
            p.get("workflow_states", {}).get(last_stage_order, {}).get("status")
            for p in products
        )
        if all_completed:
            return "completed"
        
        # Check in progress
        in_progress = any(
            s.get("status") is True
            for p in products
            for s in p.get("workflow_states", {}).values()
        )
        
        if not in_progress:
            now = utils.get_utc_now()
            deadlines = [
                self.parse_datetime(s.get("deadline"))
                for p in products
                for s in p.get("workflow_states", {}).values()
            ]
            valid_deadlines = [d for d in deadlines if d]
            earliest = min(valid_deadlines) if valid_deadlines else None
            in_progress = earliest and now > earliest
        
        return "in_progress" if in_progress else "planned"
