from copy import deepcopy
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple

from bson import ObjectId
from fastapi import HTTPException, UploadFile

from app.schemas.release import ReleaseCreate, ReleaseUpdate
from app.models.release import Release
from app.services.workflow_service import WorkflowService

from app.services.file_service import FileService


class ReleaseService:
    def __init__(self, db):
        self.db = db
        self.collection = db.releases
        self.workflow_service = WorkflowService(db)
        self.file_service = FileService(db)

    async def get_releases(
        self,
        skip: int = 0,
        limit: int = 100,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[dict]:
        """Get all releases with pagination and optional date range filtering"""
        query = {}

        if start_date or end_date:
            query["release_date"] = {}
            if start_date:
                try:
                    start_datetime = datetime.fromisoformat(start_date)
                    query["release_date"]["$gte"] = start_datetime
                except ValueError:
                    # Log error or ignore invalid date
                    pass
            if end_date:
                try:
                    # Set to end of day
                    end_datetime = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
                    query["release_date"]["$lte"] = end_datetime
                except ValueError:
                    pass

        cursor = (
            self.collection.find(query)
            .skip(skip)
            .limit(limit)
            .sort("release_date", 1)
        )
        releases = []
        async for release in cursor:
            releases.append(release)
        return releases

    async def get_release_by_id(self, release_id: str) -> Optional[dict]:
        """Get a specific release by ID"""
        release = await self.collection.find_one({"_id": ObjectId(release_id)})
        if release and "workflow_states" not in release:
            # Migration: Initialize workflow_states if missing
            workflow = await self._get_workflow_or_error(release.get("release_type"))
            release["workflow_states"] = self._build_state_template(workflow, release.get("release_date"))
            await self.collection.update_one(
                {"_id": release["_id"]},
                {"$set": {"workflow_states": release["workflow_states"]}}
            )
        return release

    async def create_release(self, release_data: ReleaseCreate) -> dict:
        """Create a new release with workflow state initialization"""
        workflow = await self._get_workflow_or_error(release_data.release_type)
        workflow_state_template = self._build_state_template(workflow, release_data.release_date)

        products_dicts = []
        for product in release_data.products or []:
            product_dict = product.model_dump()
            product_dict["workflow_states"] = deepcopy(workflow_state_template)
            products_dicts.append(product_dict)

        release = Release(
            name=release_data.name,
            description=release_data.description,
            release_date=release_data.release_date,
            release_type=release_data.release_type,
            status=release_data.status,
            overall_scope=release_data.overall_scope,
            jira_release_version=release_data.jira_release_version,
            chg_number=release_data.chg_number,
            products=products_dicts,
            workflow_states=workflow_state_template,
        )

        result = await self.collection.insert_one(release.to_dict())
        return await self.collection.find_one({"_id": result.inserted_id})

    async def update_release(
        self, release_id: str, release_data: ReleaseUpdate
    ) -> Optional[dict]:
        """Update an existing release"""
        existing_release = await self.collection.find_one({"_id": ObjectId(release_id)})
        if not existing_release:
            return None

        update_data = release_data.model_dump(exclude_none=True)

        if "release_type" in update_data and update_data["release_type"] != existing_release.get(
            "release_type"
        ):
            raise HTTPException(
                status_code=400,
                detail="Changing release_type on an existing release is not supported. Create a new release instead.",
            )

        if "products" in update_data and update_data["products"] is not None:
            # Preserve workflow_states when updating products
            existing_products = existing_release.get("products", [])
            existing_product_map = {
                p.get("product_id"): p.get("workflow_states", {})
                for p in existing_products
            }
            
            updated_products = []
            for product in update_data["products"]:
                product_dict = product.model_dump() if hasattr(product, "model_dump") else product
                product_id = product_dict.get("product_id")
                
                # Preserve existing workflow_states if they exist, but ensure all stages are present
                if product_id in existing_product_map:
                    existing_states = existing_product_map[product_id]
                    # Ensure all stages from workflow exist
                    workflow = await self._get_workflow_or_error(existing_release.get("release_type"))
                    release_date = existing_release.get("release_date")
                    states, changed = self._ensure_product_states(
                        {"workflow_states": existing_states}, workflow, release_date
                    )
                    product_dict["workflow_states"] = states
                elif "workflow_states" not in product_dict:
                    # If new product, initialize workflow states
                    workflow = await self._get_workflow_or_error(existing_release.get("release_type"))
                    release_date = existing_release.get("release_date")
                    product_dict["workflow_states"] = self._build_state_template(workflow, release_date)
                
                updated_products.append(product_dict)
            
            update_data["products"] = updated_products

        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"_id": ObjectId(release_id)},
                {"$set": update_data},
            )

        return await self.collection.find_one({"_id": ObjectId(release_id)})

    async def delete_release(self, release_id: str) -> bool:
        """Delete a release"""
        result = await self.collection.delete_one({"_id": ObjectId(release_id)})
        return result.deleted_count > 0

    async def advance_product_stage(self, release_id: str, product_id: str) -> dict:
        """Advance the next pending workflow stage for a product."""
        release = await self._get_release_or_404(release_id)
        workflow = await self._get_workflow_or_error(release.get("release_type"))
        product = self._get_product_or_404(release, product_id)
        release_date = release.get("release_date")

        states, changed = self._ensure_product_states(product, workflow, release_date)
        if changed:
            await self._persist_workflow_states(release["_id"], product_id, states)

        next_stage = self._determine_next_stage(workflow, states)
        if not next_stage:
            raise HTTPException(
                status_code=400, detail="Product has already completed all workflow stages."
            )

        stage_key = str(next_stage["order"])
        # Ensure stage state exists
        if stage_key not in states:
            states[stage_key] = self._blank_stage_state()
        stage_state = states.get(stage_key)

        if next_stage.get("requires_attachment") and next_stage.get("attachment_mandatory"):
            if not stage_state.get("attachment_id"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Stage '{next_stage['name']}' requires an attachment before advancing.",
                )

        now = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": release["_id"], "products.product_id": product_id},
            {
                "$set": {
                    f"products.$.workflow_states.{stage_key}.status": True,
                    f"products.$.workflow_states.{stage_key}.completed_at": now,
                    "updated_at": now,
                }
            },
        )

        return await self.get_release_by_id(release_id)

    async def upload_product_stage_attachment(
        self,
        release_id: str,
        product_id: str,
        stage_order: int,
        file: UploadFile,
        uploaded_by: Optional[str] = None,
    ) -> dict:
        """Upload an attachment for a specific workflow stage."""
        release = await self._get_release_or_404(release_id)
        workflow = await self._get_workflow_or_error(release.get("release_type"))
        product = self._get_product_or_404(release, product_id)
        release_date = release.get("release_date")

        states, changed = self._ensure_product_states(product, workflow, release_date)
        if changed:
            await self._persist_workflow_states(release["_id"], product_id, states)

        stage = self._get_stage_by_order(workflow, stage_order)
        if not stage:
            raise HTTPException(status_code=404, detail="Stage not found in workflow template.")

        stage_key = str(stage_order)
        stage_state = states.get(stage_key, self._blank_stage_state())

        uploaded_file = await self.file_service.upload_file(
            file=file,
            release_id=release_id,
            uploaded_by=uploaded_by,
            file_type="workflow_stage_attachment",
            tags=[
                release.get("release_type", ""),
                product_id,
                f"stage_{stage_order}",
            ],
        )

        now = datetime.now(timezone.utc)
        file_id = str(uploaded_file["_id"])
        filename = uploaded_file.get("original_filename") or uploaded_file.get("filename")

        # Prepare attachment data
        attachment_data = {
            "id": file_id,
            "filename": filename,
            "uploaded_at": now,
            "uploaded_by": uploaded_by
        }

        # Push to attachments array and set singular implementation for backward compat if needed (or just rely on array)
        # We will maintain singular fields for now to avoid breaking other parts, but logic will primarily use array in new frontend code
        # Actually, let's just push to 'attachments' list.
        
        await self.collection.update_one(
            {"_id": release["_id"], "products.product_id": product_id},
            {
                "$push": {
                    f"products.$.workflow_states.{stage_key}.attachments": attachment_data
                },
                "$set": {
                    # Keep these for backward compatibility for a bit, or just update them to the LATEST file
                    f"products.$.workflow_states.{stage_key}.attachment_id": file_id,
                    f"products.$.workflow_states.{stage_key}.attachment_filename": filename,
                    f"products.$.workflow_states.{stage_key}.attachment_uploaded_at": now,
                    "updated_at": now,
                }
            },
        )

        return await self.get_release_by_id(release_id)

    async def delete_product_stage_attachment(
        self,
        release_id: str,
        product_id: str,
        stage_order: int,
        attachment_id: str,
    ) -> dict:
        """Delete an attachment from a workflow stage."""
        release = await self._get_release_or_404(release_id)
        
        # Verify stage and product exist logic similar to upload...
        # For efficiency, we can just try to update. But validation is good.
        
        stage_key = str(stage_order)
        
        # 1. Delete file from storage
        try:
            await self.file_service.delete_file(attachment_id)
        except Exception:
            # If file doesn't exist in storage, we still want to remove the reference
            pass
        
        now = datetime.now(timezone.utc)

        # 2. Pull from array
        await self.collection.update_one(
            {"_id": release["_id"], "products.product_id": product_id},
            {
                "$pull": {
                    f"products.$.workflow_states.{stage_key}.attachments": {"id": attachment_id}
                },
                "$set": {"updated_at": now}
            }
        )
        
        # 3. Clean up legacy fields if needed (if matches deleted ID)
        # We need to check if we just deleted the file referenced by legacy fields
        # This is a bit tricky with atomic updates. 
        # Simplest approach: fetch release again, check array, update legacy field to last item or null.
        
        updated_release = await self.get_release_by_id(release_id)
        # We can implement a smarter check here if critical, but for now relying on array is preferred.
        # But let's actally fix the legacy fields to reflect current reality (last item).
        
        product = next((p for p in updated_release["products"] if p["product_id"] == product_id), None)
        if product:
            state = product["workflow_states"].get(stage_key)
            attachments = state.get("attachments", [])
            
            legacy_update = {}
            if attachments:
                last = attachments[-1]
                legacy_update = {
                    f"products.$.workflow_states.{stage_key}.attachment_id": last["id"],
                    f"products.$.workflow_states.{stage_key}.attachment_filename": last["filename"],
                    f"products.$.workflow_states.{stage_key}.attachment_uploaded_at": last["uploaded_at"]
                }
            else:
                 legacy_update = {
                    f"products.$.workflow_states.{stage_key}.attachment_id": None,
                    f"products.$.workflow_states.{stage_key}.attachment_filename": None,
                    f"products.$.workflow_states.{stage_key}.attachment_uploaded_at": None
                }
            
            if legacy_update:
                 await self.collection.update_one(
                    {"_id": release["_id"], "products.product_id": product_id},
                    {"$set": legacy_update}
                )
                
        return await self.get_release_by_id(release_id)

    async def upload_custom_attachment(
        self,
        release_id: str,
        file: UploadFile,
        uploaded_by: Optional[str] = None,
    ) -> dict:
        """Upload a custom attachment for the release."""
        release = await self._get_release_or_404(release_id)

        uploaded_file = await self.file_service.upload_file(
            file=file,
            release_id=release_id,
            uploaded_by=uploaded_by,
            file_type="custom_attachment",
            tags=[release.get("release_type", ""), "custom"],
        )

        now = datetime.now(timezone.utc)
        attachment_data = {
            "id": str(uploaded_file["_id"]),
            "filename": uploaded_file.get("original_filename") or uploaded_file.get("filename"),
            "uploaded_at": now,
            "uploaded_by": uploaded_by
        }

        await self.collection.update_one(
            {"_id": ObjectId(release_id)},
            {
                "$push": {"custom_attachments": attachment_data},
                "$set": {"updated_at": now}
            }
        )

        return await self.get_release_by_id(release_id)

    async def delete_custom_attachment(
        self,
        release_id: str,
        attachment_id: str,
    ) -> dict:
        """Delete a custom attachment."""
        release = await self._get_release_or_404(release_id)
        
        # Verify attachment exists in release
        attachments = release.get("custom_attachments", [])
        attachment = next((a for a in attachments if a.get("id") == attachment_id), None)
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found in release")

        # Delete file from GridFS
        await self.file_service.delete_file(attachment_id)

        # Remove from release document
        await self.collection.update_one(
            {"_id": ObjectId(release_id)},
            {
                "$pull": {"custom_attachments": {"id": attachment_id}},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )

        return await self.get_release_by_id(release_id)



    async def update_stage_timeline(
        self,
        release_id: str,
        product_id: Optional[str],
        stage_order: int,
        deadline: Optional[datetime] = None,
        days_before_release: Optional[int] = None,
    ) -> dict:
        """Update timeline for a stage. If product_id is None, update for all products.
        Either deadline (direct date/time) or days_before_release must be provided.
        """
        release = await self._get_release_or_404(release_id)
        release_date = release.get("release_date")
        
        if not deadline and days_before_release is not None:
            # Calculate deadline from days before release
            if not release_date:
                raise HTTPException(
                    status_code=400, detail="Release date is required to calculate deadlines"
                )
            if isinstance(release_date, str):
                release_date = datetime.fromisoformat(release_date.replace("Z", "+00:00"))
            # Calculate excluding weekends
            target_date = release_date
            days_subtracted = 0
            while days_subtracted < days_before_release:
                target_date = target_date - timedelta(days=1)
                if target_date.weekday() < 5:  # Monday-Friday
                    days_subtracted += 1
            deadline = target_date.replace(hour=18, minute=0, second=0, microsecond=0)
        elif not deadline:
            raise HTTPException(
                status_code=400, detail="Either deadline or days_before_release must be provided"
            )

        update_data = {
            f"products.$.workflow_states.{stage_order}.deadline": deadline.isoformat(),
            "updated_at": datetime.now(timezone.utc),
        }

        if product_id:
            # Update for specific product
            await self.collection.update_one(
                {"_id": release["_id"], "products.product_id": product_id},
                {"$set": update_data},
            )
        else:
            # Update release-level default timeline
            await self.collection.update_one(
                {"_id": release["_id"]},
                {"$set": {
                    f"workflow_states.{stage_order}.deadline": deadline.isoformat(),
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            
            # Also update for all products that don't have a specific override?
            # For now, let's update all products to keep them in sync with the default,
            # unless we want to track overrides explicitly.
            # The user requirement implies "default timelines for the release".
            # If we update the default, it makes sense to update the products too, 
            # as they initially inherit from the default.
            
            release_doc = await self.collection.find_one({"_id": release["_id"]})
            if release_doc:
                for product in release_doc.get("products", []):
                    product_id_to_update = product.get("product_id")
                    if product_id_to_update:
                        # Update this specific product
                        await self.collection.update_one(
                            {"_id": release["_id"], "products.product_id": product_id_to_update},
                            {"$set": update_data},
                        )

        return await self.get_release_by_id(release_id)

    async def _persist_workflow_states(self, release_id: ObjectId, product_id: str, states: dict):
        now = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": release_id, "products.product_id": product_id},
            {
                "$set": {
                    "products.$.workflow_states": states,
                    "updated_at": now,
                }
            },
        )

    async def _get_release_or_404(self, release_id: str) -> dict:
        release = await self.collection.find_one({"_id": ObjectId(release_id)})
        if not release:
            raise HTTPException(status_code=404, detail="Release not found")
        return release

    async def _get_workflow_or_error(self, release_type: str) -> dict:
        workflow = await self.workflow_service.get_workflow_by_release_type(release_type)
        if not workflow:
            raise HTTPException(
                status_code=400,
                detail=f"No workflow template configured for release_type '{release_type}'.",
            )
        return workflow

    def _get_product_or_404(self, release: dict, product_id: str) -> dict:
        for product in release.get("products", []):
            if product.get("product_id") == product_id:
                return product
        raise HTTPException(
            status_code=404,
            detail="Product not found in this release",
        )

    def _build_state_template(self, workflow: dict, release_date) -> dict:
        template = {}
        # Handle release_date which might be datetime or string
        if isinstance(release_date, str):
            try:
                release_date = datetime.fromisoformat(release_date.replace("Z", "+00:00"))
            except:
                release_date = None
        
        for stage in sorted(workflow.get("stages", []), key=lambda s: s["order"]):
            days_before = stage.get("default_days_before_release", 0)
            deadline = None
            if release_date and isinstance(release_date, datetime) and days_before > 0:
                # Calculate deadline excluding weekends (Saturday=5, Sunday=6)
                target_date = release_date
                days_subtracted = 0
                while days_subtracted < days_before:
                    target_date = target_date - timedelta(days=1)
                    # Skip weekends (0 = Monday, 6 = Sunday)
                    if target_date.weekday() < 5:  # Monday-Friday (0-4)
                        days_subtracted += 1
                # Set default time to 6 PM SGT (18:00)
                deadline = target_date.replace(hour=18, minute=0, second=0, microsecond=0)
            template[str(stage["order"])] = self._blank_stage_state(
                deadline=deadline
            )
        return template

    def _blank_stage_state(self, deadline: Optional[datetime] = None) -> dict:
        deadline_str = None
        if deadline:
            if isinstance(deadline, datetime):
                deadline_str = deadline.isoformat()
            else:
                deadline_str = str(deadline)
        return {
            "status": False,
            "completed_at": None,
            "attachment_id": None,
            "attachment_filename": None,
            "attachment_uploaded_at": None,
            "attachments": [],
            "deadline": deadline_str,
        }

    def _ensure_product_states(self, product: dict, workflow: dict, release_date: Optional[datetime] = None) -> Tuple[dict, bool]:
        states = product.get("workflow_states")
        changed = False

        if not states:
            states = self._build_state_template(workflow, release_date) if release_date else self._build_state_template(workflow, datetime.now(timezone.utc))
            product["workflow_states"] = states
            changed = True
        else:
            # Ensure all stages from workflow exist in states
            for stage in workflow.get("stages", []):
                key = str(stage["order"])
                if key not in states:
                    days_before = stage.get("default_days_before_release", 0)
                    deadline = None
                    if release_date and isinstance(release_date, datetime) and days_before > 0:
                        # Calculate deadline excluding weekends
                        target_date = release_date
                        days_subtracted = 0
                        while days_subtracted < days_before:
                            target_date = target_date - timedelta(days=1)
                            if target_date.weekday() < 5:  # Monday-Friday
                                days_subtracted += 1
                        deadline = target_date.replace(hour=18, minute=0, second=0, microsecond=0)
                    states[key] = self._blank_stage_state(deadline=deadline)
                    changed = True

        return states, changed

    def _determine_next_stage(self, workflow: dict, states: dict) -> Optional[dict]:
        for stage in sorted(workflow.get("stages", []), key=lambda s: s["order"]):
            state = states.get(str(stage["order"]))
            if not state or not state.get("status"):
                return stage
        return None

    def _get_stage_by_order(self, workflow: dict, order: int) -> Optional[dict]:
        for stage in workflow.get("stages", []):
            if stage.get("order") == order:
                return stage
        return None
