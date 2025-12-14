from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from app.core.config import settings
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationUpdate
from pymongo import MongoClient

class ApplicationService:
    def __init__(self):
        self.client = MongoClient(settings.MONGODB_URL)
        self.db = self.client[settings.DATABASE_NAME]
        self.collection = self.db.applications

    def create(self, application_in: ApplicationCreate) -> Application:
        application_data = application_in.model_dump()
        application = Application(**application_data)
        result = self.collection.insert_one(application.to_dict())
        return application

    def get(self, id: str) -> Optional[Application]:
        if not ObjectId.is_valid(id):
            return None
        data = self.collection.find_one({"_id": ObjectId(id)})
        return Application.from_dict(data) if data else None

    def get_all(self) -> List[Application]:
        cursor = self.collection.find()
        return [Application.from_dict(data) for data in cursor]

    def update(self, id: str, application_in: ApplicationUpdate) -> Optional[Application]:
        if not ObjectId.is_valid(id):
            return None
        
        update_data = application_in.model_dump(exclude_unset=True)
        if not update_data:
            return self.get(id)
            
        update_data['updated_at'] = datetime.now(timezone.utc)
        
        result = self.collection.update_one(
            {"_id": ObjectId(id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return self.get(id)
        return None

    def delete(self, id: str) -> bool:
        if not ObjectId.is_valid(id):
            return False
        result = self.collection.delete_one({"_id": ObjectId(id)})
        return result.deleted_count > 0
