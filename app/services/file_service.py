from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import os
import uuid
from fastapi import UploadFile

from app.models.file import File
from app.core.config import settings

class FileService:
    def __init__(self, db):
        self.db = db
        self.collection = db.files

    async def get_files(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all files with pagination"""
        cursor = self.collection.find().skip(skip).limit(limit)
        files = []
        async for file in cursor:
            files.append(file)
        return files

    async def get_file_by_id(self, file_id: str) -> Optional[dict]:
        """Get a specific file by ID"""
        file = await self.collection.find_one({"_id": ObjectId(file_id)})
        return file

    async def upload_file(self, file: UploadFile, release_id: Optional[str] = None) -> dict:
        """Upload a file"""
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Create file record
        file_record = File(
            filename=unique_filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=len(content),
            content_type=file.content_type,
            release_id=release_id,
            file_type="attachment"  # Default type
        )
        
        result = await self.collection.insert_one(file_record.to_dict())
        created_file = await self.collection.find_one({"_id": result.inserted_id})
        return created_file

    async def delete_file(self, file_id: str) -> bool:
        """Delete a file"""
        # Get file record first
        file_record = await self.collection.find_one({"_id": ObjectId(file_id)})
        if file_record:
            # Delete physical file
            if os.path.exists(file_record["file_path"]):
                os.remove(file_record["file_path"])
            
            # Delete database record
            result = await self.collection.delete_one({"_id": ObjectId(file_id)})
            return result.deleted_count > 0
        return False
