from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.schemas.release import ReleaseCreate, ReleaseUpdate
from app.models.release import Release

class ReleaseService:
    def __init__(self, db):
        self.db = db
        self.collection = db.releases

    async def get_releases(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all releases with pagination"""
        cursor = self.collection.find().skip(skip).limit(limit)
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
        # Convert ProductScope objects to dictionaries
        product_scopes_dicts = [scope.dict() for scope in release_data.product_scopes] if release_data.product_scopes else []
        
        release = Release(
            name=release_data.name,
            description=release_data.description,
            release_date=release_data.release_date,
            status=release_data.status,
            overall_scope=release_data.overall_scope,
            jira_release_version=release_data.jira_release_version,
            participating_squads=release_data.participating_squads,
            product_scopes=product_scopes_dicts
        )
        
        result = await self.collection.insert_one(release.to_dict())
        created_release = await self.collection.find_one({"_id": result.inserted_id})
        return created_release

    async def update_release(self, release_id: str, release_data: ReleaseUpdate) -> Optional[dict]:
        """Update an existing release"""
        update_data = {k: v for k, v in release_data.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
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
