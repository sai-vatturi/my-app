from copy import deepcopy
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import HTTPException, UploadFile

from app.schemas.release import ReleaseCreate, ReleaseUpdate
from app.models.release import Release
from app.services.workflow_service import WorkflowService
from app.services.release_attachment_service import ReleaseAttachmentService
from app.core import utils


class ReleaseService:
    def __init__(self, db):
        self.db = db
        self.collection = db.releases
        self.workflow_service = WorkflowService(db)
        self.attachment_service = ReleaseAttachmentService(db)

    @staticmethod
    def _build_query(release_id: str) -> dict:
        """Build query dict for release lookup by ID or name."""
        if ObjectId.is_valid(release_id):
            return {"_id": ObjectId(release_id)}
        return {"name": release_id}

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
                    query["release_date"]["$gte"] = datetime.fromisoformat(start_date)
                except ValueError:
                    pass
            if end_date:
                try:
                    query["release_date"]["$lte"] = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
                except ValueError:
                    pass

        cursor = self.collection.find(query).skip(skip).limit(limit).sort("release_date", 1)
        return [release async for release in cursor]

    async def get_release_by_id(self, release_id: str) -> Optional[dict]:
        """Get a specific release by ID or Name"""
        release = await self.collection.find_one(self._build_query(release_id))
        if release and "workflow_states" not in release:
            workflow = await self._get_workflow_or_error(release.get("release_type"))
            release["workflow_states"] = self.workflow_service.build_state_template(workflow, release.get("release_date"))
            await self.collection.update_one(
                {"_id": release["_id"]},
                {"$set": {"workflow_states": release["workflow_states"]}}
            )
        
        if release:
            release = await self._refresh_release_status(release)
        return release

    async def create_release(self, release_data: ReleaseCreate) -> dict:
        """Create a new release with workflow state initialization"""
        if await self.collection.find_one({"name": release_data.name}):
            raise HTTPException(status_code=400, detail=f"Release with name '{release_data.name}' already exists.")

        workflow = await self._get_workflow_or_error(release_data.release_type)
        workflow_state_template = self.workflow_service.build_state_template(workflow, release_data.release_date)

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
            status="planned",
            overall_scope=release_data.overall_scope,
            chg_number=release_data.chg_number,
            products=products_dicts,
            workflow_states=workflow_state_template,
            business_unit_id=release_data.business_unit_id,
        )

        result = await self.collection.insert_one(release.to_dict())
        return await self.collection.find_one({"_id": result.inserted_id})

    async def update_release(self, release_id: str, release_data: ReleaseUpdate) -> Optional[dict]:
        """Update an existing release"""
        existing_release = await self.collection.find_one(self._build_query(release_id))
        if not existing_release:
            return None

        update_data = release_data.model_dump(exclude_none=True)

        if "release_type" in update_data and update_data["release_type"] != existing_release.get("release_type"):
            raise HTTPException(
                status_code=400,
                detail="Changing release_type on an existing release is not supported. Create a new release instead.",
            )

        if "name" in update_data:
            existing_with_name = await self.collection.find_one({"name": update_data["name"]})
            if existing_with_name and str(existing_with_name["_id"]) != str(existing_release["_id"]):
                raise HTTPException(status_code=400, detail=f"Release with name '{update_data['name']}' already exists.")

        if "products" in update_data and update_data["products"] is not None:
            existing_product_map = {p.get("product_id"): p.get("workflow_states", {}) for p in existing_release.get("products", [])}
            updated_products = []
            
            for product in update_data["products"]:
                product_dict = product.model_dump() if hasattr(product, "model_dump") else product
                product_id = product_dict.get("product_id")
                
                if product_id in existing_product_map:
                    workflow = await self._get_workflow_or_error(existing_release.get("release_type"))
                    states, _ = self.workflow_service.ensure_product_states(
                        {"workflow_states": existing_product_map[product_id]}, workflow, existing_release.get("release_date")
                    )
                    product_dict["workflow_states"] = states
                else:
                    workflow = await self._get_workflow_or_error(existing_release.get("release_type"))
                    product_dict["workflow_states"] = self.workflow_service.build_state_template(workflow, existing_release.get("release_date"))
                updated_products.append(product_dict)
            update_data["products"] = updated_products

        if update_data:
            update_data["updated_at"] = utils.get_utc_now()
            await self.collection.update_one({"_id": existing_release["_id"]}, {"$set": update_data})

        return await self.collection.find_one({"_id": existing_release["_id"]})

    async def delete_release(self, release_id: str) -> bool:
        """Delete a release"""
        result = await self.collection.delete_one(self._build_query(release_id))
        return result.deleted_count > 0

    async def revert_product_stage(self, release_id: str, product_id: str) -> dict:
        """Revert the last completed workflow stage for a product."""
        release = await self._get_release_or_404(release_id)
        workflow = await self._get_workflow_or_error(release.get("release_type"))
        product = self._get_product_or_404(release, product_id)
        
        states = product.get("workflow_states", {})
        sorted_stages = sorted(workflow.get("stages", []), key=lambda s: s["order"], reverse=True)
        
        stage_to_revert = next(
            (s for s in sorted_stages if states.get(str(s["order"]), {}).get("status") is True),
            None
        )
        
        if not stage_to_revert:
            raise HTTPException(status_code=400, detail="Product has no completed stages to revert.")

        stage_key = str(stage_to_revert["order"])
        await self.collection.update_one(
            {"_id": release["_id"], "products.product_id": product_id},
            {"$set": {
                f"products.$.workflow_states.{stage_key}.status": False,
                f"products.$.workflow_states.{stage_key}.completed_at": None,
                "updated_at": utils.get_utc_now(),
            }}
        )
        return await self.get_release_by_id(release_id)

    async def advance_product_stage(self, release_id: str, product_id: str) -> dict:
        """Advance the next pending workflow stage for a product."""
        release = await self._get_release_or_404(release_id)
        workflow = await self._get_workflow_or_error(release.get("release_type"))
        product = self._get_product_or_404(release, product_id)

        states, changed = self.workflow_service.ensure_product_states(product, workflow, release.get("release_date"))
        if changed:
            await self._persist_workflow_states(release["_id"], product_id, states)

        next_stage = self.workflow_service.determine_next_stage(workflow, states)
        if not next_stage:
            raise HTTPException(status_code=400, detail="Product has already completed all workflow stages.")

        stage_key = str(next_stage["order"])
        if stage_key not in states:
            states[stage_key] = self.workflow_service.blank_stage_state()

        if next_stage.get("requires_attachment") and next_stage.get("attachment_mandatory"):
            stage_state = states.get(stage_key, {})
            if not stage_state.get("attachment_id") and not stage_state.get("attachments"):
                raise HTTPException(status_code=400, detail=f"Stage '{next_stage['name']}' requires an attachment before advancing.")

        now = utils.get_utc_now()
        await self.collection.update_one(
            {"_id": release["_id"], "products.product_id": product_id},
            {"$set": {
                f"products.$.workflow_states.{stage_key}.status": True,
                f"products.$.workflow_states.{stage_key}.completed_at": now,
                "updated_at": now,
            }}
        )
        return await self.get_release_by_id(release_id)

    # Delegate attachment operations to ReleaseAttachmentService
    async def upload_product_stage_attachment(self, release_id: str, product_id: str, stage_order: int, file: UploadFile, uploaded_by: Optional[str] = None) -> dict:
        return await self.attachment_service.upload_product_stage_attachment(release_id, product_id, stage_order, file, uploaded_by)

    async def delete_product_stage_attachment(self, release_id: str, product_id: str, stage_order: int, attachment_id: str) -> dict:
        return await self.attachment_service.delete_product_stage_attachment(release_id, product_id, stage_order, attachment_id)

    async def upload_custom_attachment(self, release_id: str, file: UploadFile, uploaded_by: Optional[str] = None) -> dict:
        return await self.attachment_service.upload_custom_attachment(release_id, file, uploaded_by)

    async def delete_custom_attachment(self, release_id: str, attachment_id: str) -> dict:
        return await self.attachment_service.delete_custom_attachment(release_id, attachment_id)

    async def update_stage_timeline(
        self,
        release_id: str,
        product_id: Optional[str],
        stage_order: int,
        deadline: Optional[datetime] = None,
        days_before_release: Optional[int] = None,
    ) -> dict:
        """Update timeline for a stage. If product_id is None, update for all products."""
        release = await self._get_release_or_404(release_id)
        release_date = release.get("release_date")
        
        if not deadline and days_before_release is not None:
            if not release_date:
                raise HTTPException(status_code=400, detail="Release date is required to calculate deadlines")
            release_date = self.workflow_service.parse_datetime(release_date)
            deadline = utils.calculate_deadline(release_date, days_before_release)
        elif not deadline:
            raise HTTPException(status_code=400, detail="Either deadline or days_before_release must be provided")

        update_data = {
            f"products.$.workflow_states.{stage_order}.deadline": deadline.isoformat(),
            "updated_at": utils.get_utc_now(),
        }

        if product_id:
            await self.collection.update_one(
                {"_id": release["_id"], "products.product_id": product_id},
                {"$set": update_data},
            )
        else:
            await self.collection.update_one(
                {"_id": release["_id"]},
                {"$set": {f"workflow_states.{stage_order}.deadline": deadline.isoformat(), "updated_at": utils.get_utc_now()}}
            )
            release_doc = await self.collection.find_one({"_id": release["_id"]})
            for product in release_doc.get("products", []):
                if product.get("product_id"):
                    await self.collection.update_one(
                        {"_id": release["_id"], "products.product_id": product["product_id"]},
                        {"$set": update_data},
                    )
        return await self.get_release_by_id(release_id)

    async def _persist_workflow_states(self, release_id: ObjectId, product_id: str, states: dict):
        await self.collection.update_one(
            {"_id": release_id, "products.product_id": product_id},
            {"$set": {"products.$.workflow_states": states, "updated_at": utils.get_utc_now()}}
        )

    async def _get_release_or_404(self, release_id: str) -> dict:
        release = await self.collection.find_one(self._build_query(release_id))
        if not release:
            raise HTTPException(status_code=404, detail="Release not found")
        return release

    async def _get_workflow_or_error(self, release_type: str) -> dict:
        workflow = await self.workflow_service.get_workflow_by_release_type(release_type)
        if not workflow:
            raise HTTPException(status_code=400, detail=f"No workflow template configured for release_type '{release_type}'.")
        return workflow

    def _get_product_or_404(self, release: dict, product_id: str) -> dict:
        product = next((p for p in release.get("products", []) if p.get("product_id") == product_id), None)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found in this release")
        return product

    async def _refresh_release_status(self, release: dict) -> dict:
        """Auto-update release status based on workflow progress."""
        current_status = release.get("status", "planned")
        if current_status == "cancelled":
            return release
            
        workflow = await self._get_workflow_or_error(release.get("release_type"))
        new_status = self.workflow_service.calculate_release_status(release.get("products", []), workflow)
        
        if new_status != current_status:
            await self.collection.update_one(
                {"_id": release["_id"]},
                {"$set": {"status": new_status, "updated_at": utils.get_utc_now()}}
            )
            release["status"] = new_status
        return release
