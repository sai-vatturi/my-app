from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import os
from fastapi import UploadFile, HTTPException

from app.models.file import File
from app.core.storage import get_storage_manager
from app.core.config import settings

class FileService:
    def __init__(self, db):
        self.db = db
        self.collection = db.files
        self.storage = get_storage_manager()

    async def get_files(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all files with pagination"""
        cursor = self.collection.find().skip(skip).limit(limit)
        files = []
        async for file in cursor:
            files.append(file)
        return files

    async def get_file_by_id(self, file_id: str) -> Optional[dict]:
        """Get a specific file by ID"""
        file_record = await self.collection.find_one({"_id": ObjectId(file_id)})
        return file_record

    async def upload_file(
        self, 
        file: UploadFile, 
        release_id: Optional[str] = None,
        uploaded_by: Optional[str] = None,
        file_type: str = "attachment",
        tags: List[str] = None,
        container: str = "uploads"
    ) -> dict:
        """
        Upload a file to blob storage and create database record
        
        Args:
            file: FastAPI UploadFile object
            release_id: Optional release ID to associate with
            uploaded_by: User who uploaded the file
            file_type: Type of file (attachment, document, image, etc.)
            tags: Optional tags for categorization
            container: Storage container name
        """
        # Validate file size
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes"
            )
        
        # Get file extension
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        
        # Store file in blob storage
        try:
            storage_id = await self.storage.store_file(
                file_content=content,
                file_extension=file_extension,
                container=container
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to store file: {str(e)}")
        
        # Create file record
        file_record = File(
            filename=file.filename or f"file{file_extension}",
            original_filename=file.filename,
            storage_id=storage_id,
            container=container,
            file_size=len(content),
            content_type=file.content_type,
            file_type=file_type,
            release_id=release_id,
            uploaded_by=uploaded_by,
            tags=tags or []
        )
        
        try:
            result = await self.collection.insert_one(file_record.to_dict())
            created_file = await self.collection.find_one({"_id": result.inserted_id})
            return created_file
        except Exception as e:
            # If database insert fails, clean up the stored file
            await self.storage.delete_file(storage_id, container)
            raise HTTPException(status_code=500, detail=f"Failed to create file record: {str(e)}")

    async def download_file(self, file_id: str) -> tuple[bytes, dict]:
        """
        Download file content and metadata
        
        Returns:
            Tuple of (file_content, file_metadata)
        """
        # Get file record from database
        file_record = await self.get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get file content from storage
        storage_id = file_record.get("storage_id")
        container = file_record.get("container", "uploads")
        
        if not storage_id:
            raise HTTPException(status_code=500, detail="File storage ID not found")
        
        file_content = await self.storage.get_file(storage_id, container)
        if file_content is None:
            raise HTTPException(status_code=404, detail="File content not found in storage")
        
        return file_content, file_record

    async def delete_file(self, file_id: str) -> bool:
        """Delete a file from both storage and database"""
        # Get file record first
        file_record = await self.collection.find_one({"_id": ObjectId(file_id)})
        if not file_record:
            return False
        
        storage_id = file_record.get("storage_id")
        container = file_record.get("container", "uploads")
        
        # Delete from storage
        if storage_id:
            await self.storage.delete_file(storage_id, container)
        
        # Delete database record
        result = await self.collection.delete_one({"_id": ObjectId(file_id)})
        return result.deleted_count > 0

    async def get_files_by_release(self, release_id: str, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get files associated with a specific release"""
        cursor = self.collection.find({"release_id": release_id}).skip(skip).limit(limit)
        files = []
        async for file in cursor:
            files.append(file)
        return files

    async def get_files_by_type(self, file_type: str, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get files by type (attachment, document, image, etc.)"""
        cursor = self.collection.find({"file_type": file_type}).skip(skip).limit(limit)
        files = []
        async for file in cursor:
            files.append(file)
        return files

    async def get_files_by_tags(self, tags: List[str], skip: int = 0, limit: int = 100) -> List[dict]:
        """Get files that have any of the specified tags"""
        cursor = self.collection.find({"tags": {"$in": tags}}).skip(skip).limit(limit)
        files = []
        async for file in cursor:
            files.append(file)
        return files

    async def update_file_metadata(
        self, 
        file_id: str, 
        filename: Optional[str] = None,
        file_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        release_id: Optional[str] = None
    ) -> Optional[dict]:
        """Update file metadata (does not modify stored file content)"""
        update_data = {}
        
        if filename is not None:
            update_data["filename"] = filename
        if file_type is not None:
            update_data["file_type"] = file_type
        if tags is not None:
            update_data["tags"] = tags
        if release_id is not None:
            update_data["release_id"] = release_id
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"_id": ObjectId(file_id)},
                {"$set": update_data}
            )
        
        updated_file = await self.collection.find_one({"_id": ObjectId(file_id)})
        return updated_file

    async def get_storage_info(self, file_id: str) -> Optional[dict]:
        """Get storage information for a file (useful for debugging)"""
        file_record = await self.get_file_by_id(file_id)
        if not file_record:
            return None
        
        storage_id = file_record.get("storage_id")
        container = file_record.get("container", "uploads")
        
        if not storage_id:
            return None
        
        storage_info = await self.storage.get_file_info(storage_id, container)
        
        # Convert ObjectId to string for JSON serialization
        if file_record.get("_id"):
            file_record["_id"] = str(file_record["_id"])
        
        return {
            "file_record": file_record,
            "storage_info": storage_info,
            "storage_exists": await self.storage.file_exists(storage_id, container)
        }
