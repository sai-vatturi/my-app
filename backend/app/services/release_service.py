from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from app.schemas.release import ReleaseCreate, ReleaseUpdate, ReleaseType
from app.models.release import Release
from app.services.workflow_service import WorkflowService

class ReleaseService:
    def __init__(self, db):
        self.db = db
        self.collection = db.releases

    async def get_releases(self, skip: int = 0, limit: int = 100, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[dict]:
        """Get all releases with pagination and optional date range filtering"""
        query = {}
        
        # Add date range filter if provided
        if start_date or end_date:
            query["release_date"] = {}
            if start_date:
                query["release_date"]["$gte"] = start_date
            if end_date:
                query["release_date"]["$lte"] = end_date
        
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("release_date", 1)
        releases = []
        async for release in cursor:
            releases.append(release)
        return releases

    async def get_release_by_id(self, release_id: str) -> Optional[dict]:
        """Get a specific release by ID"""
        release = await self.collection.find_one({"_id": ObjectId(release_id)})
        return release

    async def create_release(self, release_data: ReleaseCreate) -> dict:
        """Create a new release"""
        
        # Convert ReleaseProduct objects to dictionaries
        products_dicts = []
        if release_data.products:
            for product in release_data.products:
                product_dict = product.model_dump()
                products_dicts.append(product_dict)
        
        # Initialize workflow states if workflow is selected
        product_workflow_states = {}
        if release_data.workflow_id:
            workflow_service = WorkflowService(self.db)
            workflow = await workflow_service.get_workflow_by_id(release_data.workflow_id)
            if workflow:
                # Initialize workflow states for each product
                for product in products_dicts:
                    product_id = product['product_id']
                    stage_dates = {}
                    for stage in workflow.get('stages', []):
                        # Calculate stage date based on default_days_before_release
                        days_before = stage.get('default_days_before_release', 0)
                        stage_date = release_data.release_date - timedelta(days=days_before)
                        stage_dates[str(stage['order'])] = stage_date.isoformat()
                    
                    product_workflow_states[product_id] = {
                        'current_stage_index': 0,  # Start at first stage
                        'stage_dates': stage_dates,
                        'attachments': {}
                    }
        
        release = Release(
            name=release_data.name,
            description=release_data.description,
            release_date=release_data.release_date,
            release_type=release_data.release_type.value,
            status=release_data.status,
            overall_scope=release_data.overall_scope,
            jira_release_version=release_data.jira_release_version,
            chg_number=release_data.chg_number,
            products=products_dicts,
            workflow_id=release_data.workflow_id,
            product_workflow_states=product_workflow_states
        )
        
        result = await self.collection.insert_one(release.to_dict())
        created_release = await self.collection.find_one({"_id": result.inserted_id})
        return created_release

    async def update_release(self, release_id: str, release_data: ReleaseUpdate) -> Optional[dict]:
        """Update an existing release"""
        update_data = release_data.model_dump(exclude_none=True)
        
        # Handle release type enum conversion
        if "release_type" in update_data:
            release_type_enum = ReleaseType(update_data["release_type"])
            update_data["release_type"] = release_type_enum.value
        
        if "products" in update_data and update_data["products"] is not None:
            update_data["products"] = [
                product.model_dump() if hasattr(product, "model_dump") else product
                for product in update_data["products"]
            ]
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"_id": ObjectId(release_id)},
                {"$set": update_data}
            )
        
        updated_release = await self.collection.find_one({"_id": ObjectId(release_id)})
        return updated_release

    async def delete_release(self, release_id: str) -> bool:
        """Delete a release"""
        result = await self.collection.delete_one({"_id": ObjectId(release_id)})
        return result.deleted_count > 0

    async def update_product_workflow_state(self, release_id: str, product_id: str, stage_index: int, attachments: Optional[List[str]] = None) -> Optional[dict]:
        """Update the workflow state for a specific product in a release"""
        release = await self.get_release_by_id(release_id)
        if not release:
            return None
        
        workflow_states = release.get('product_workflow_states', {})
        if product_id not in workflow_states:
            workflow_states[product_id] = {
                'current_stage_index': 0,
                'stage_dates': {},
                'attachments': {}
            }
        
        # Update current stage
        workflow_states[product_id]['current_stage_index'] = stage_index
        
        # Update attachments if provided
        if attachments is not None:
            workflow_states[product_id]['attachments'][str(stage_index)] = attachments
        
        # Update the release
        update_data = {
            'product_workflow_states': workflow_states,
            'updated_at': datetime.now(timezone.utc)
        }
        
        await self.collection.update_one(
            {"_id": ObjectId(release_id)},
            {"$set": update_data}
        )
        
        updated_release = await self.collection.find_one({"_id": ObjectId(release_id)})
        return updated_release

    async def update_stage_date(self, release_id: str, product_id: str, stage_index: int, stage_date: datetime) -> Optional[dict]:
        """Update the date for a specific stage of a product"""
        release = await self.get_release_by_id(release_id)
        if not release:
            return None
        
        workflow_states = release.get('product_workflow_states', {})
        if product_id not in workflow_states:
            workflow_states[product_id] = {
                'current_stage_index': 0,
                'stage_dates': {},
                'attachments': {}
            }
        
        # Update stage date
        workflow_states[product_id]['stage_dates'][str(stage_index)] = stage_date.isoformat()
        
        # Update the release
        update_data = {
            'product_workflow_states': workflow_states,
            'updated_at': datetime.now(timezone.utc)
        }
        
        await self.collection.update_one(
            {"_id": ObjectId(release_id)},
            {"$set": update_data}
        )
        
        updated_release = await self.collection.find_one({"_id": ObjectId(release_id)})
        return updated_release
