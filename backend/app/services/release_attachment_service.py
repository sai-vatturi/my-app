from typing import Optional

from bson import ObjectId
from fastapi import HTTPException, UploadFile

from app.services.file_service import FileService
from app.core import utils


class ReleaseAttachmentService:
    """Handles attachment operations for releases (upload/delete for stage and custom attachments)."""
    
    def __init__(self, db):
        self.db = db
        self.collection = db.releases
        self.file_service = FileService(db)

    async def _get_release_or_404(self, release_id: str) -> dict:
        """Get release by ID or name, raise 404 if not found."""
        if ObjectId.is_valid(release_id):
            query = {"_id": ObjectId(release_id)}
        else:
            query = {"name": release_id}
        release = await self.collection.find_one(query)
        if not release:
            raise HTTPException(status_code=404, detail="Release not found")
        return release

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
        stage_key = str(stage_order)

        uploaded_file = await self.file_service.upload_file(
            file=file,
            release_id=release_id,
            uploaded_by=uploaded_by,
            file_type="workflow_stage_attachment",
            tags=[release.get("release_type", ""), product_id, f"stage_{stage_order}"],
        )

        now = utils.get_utc_now()
        file_id = str(uploaded_file["_id"])
        attachment_data = {
            "id": file_id,
            "filename": file.filename,
            "uploaded_at": now,
            "uploaded_by": uploaded_by
        }

        await self.collection.update_one(
            {"_id": release["_id"], "products.product_id": product_id},
            {
                "$push": {f"products.$.workflow_states.{stage_key}.attachments": attachment_data},
                "$set": {
                    f"products.$.workflow_states.{stage_key}.attachment_id": file_id,
                    f"products.$.workflow_states.{stage_key}.attachment_filename": file.filename,
                    f"products.$.workflow_states.{stage_key}.attachment_uploaded_at": now,
                    "updated_at": now,
                }
            },
        )
        return await self._get_release_or_404(release_id)

    async def delete_product_stage_attachment(
        self,
        release_id: str,
        product_id: str,
        stage_order: int,
        attachment_id: str,
    ) -> dict:
        """Delete an attachment from a workflow stage."""
        release = await self._get_release_or_404(release_id)
        stage_key = str(stage_order)
        
        try:
            await self.file_service.delete_file(attachment_id)
        except Exception:
            pass
        
        now = utils.get_utc_now()
        await self.collection.update_one(
            {"_id": release["_id"], "products.product_id": product_id},
            {
                "$pull": {f"products.$.workflow_states.{stage_key}.attachments": {"id": attachment_id}},
                "$set": {"updated_at": now}
            }
        )
        
        # Update legacy fields
        updated_release = await self._get_release_or_404(release_id)
        product = next((p for p in updated_release.get("products", []) if p["product_id"] == product_id), None)
        if product:
            attachments = product.get("workflow_states", {}).get(stage_key, {}).get("attachments", [])
            last = attachments[-1] if attachments else None
            legacy_update = {
                f"products.$.workflow_states.{stage_key}.attachment_id": last["id"] if last else None,
                f"products.$.workflow_states.{stage_key}.attachment_filename": last["filename"] if last else None,
                f"products.$.workflow_states.{stage_key}.attachment_uploaded_at": last["uploaded_at"] if last else None
            }
            await self.collection.update_one(
                {"_id": release["_id"], "products.product_id": product_id},
                {"$set": legacy_update}
            )
        return await self._get_release_or_404(release_id)

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

        now = utils.get_utc_now()
        attachment_data = {
            "id": str(uploaded_file["_id"]),
            "filename": uploaded_file.get("original_filename") or uploaded_file.get("filename"),
            "uploaded_at": now,
            "uploaded_by": uploaded_by
        }

        await self.collection.update_one(
            {"_id": release["_id"]},
            {
                "$push": {"custom_attachments": attachment_data},
                "$set": {"updated_at": now}
            }
        )
        return await self._get_release_or_404(release_id)

    async def delete_custom_attachment(self, release_id: str, attachment_id: str) -> dict:
        """Delete a custom attachment."""
        release = await self._get_release_or_404(release_id)
        
        attachments = release.get("custom_attachments", [])
        if not any(a.get("id") == attachment_id for a in attachments):
            raise HTTPException(status_code=404, detail="Attachment not found in release")

        await self.file_service.delete_file(attachment_id)
        await self.collection.update_one(
            {"_id": release["_id"]},
            {
                "$pull": {"custom_attachments": {"id": attachment_id}},
                "$set": {"updated_at": utils.get_utc_now()}
            }
        )
        return await self._get_release_or_404(release_id)
