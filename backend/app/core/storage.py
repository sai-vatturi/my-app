"""
Storage abstraction layer for file handling.
This module provides a unified interface for file storage that can be easily
switched between local filesystem and cloud storage (S3, Azure Blob, etc.).
"""

import os
import uuid
import shutil
from abc import ABC, abstractmethod
from typing import Optional, BinaryIO, Tuple
from pathlib import Path
from datetime import datetime

from app.core.config import settings


class StorageBackend(ABC):
    """Abstract base class for storage backends"""
    
    @abstractmethod
    async def store_file(self, file_content: bytes, file_extension: str, container: str = "default") -> str:
        """Store a file and return its unique identifier"""
        pass
    
    @abstractmethod
    async def get_file(self, file_id: str, container: str = "default") -> Optional[bytes]:
        """Retrieve file content by ID"""
        pass
    
    @abstractmethod
    async def delete_file(self, file_id: str, container: str = "default") -> bool:
        """Delete a file by ID"""
        pass
    
    @abstractmethod
    async def file_exists(self, file_id: str, container: str = "default") -> bool:
        """Check if a file exists"""
        pass
    
    @abstractmethod
    async def get_file_info(self, file_id: str, container: str = "default") -> Optional[dict]:
        """Get file metadata"""
        pass


class LocalBlobStorage(StorageBackend):
    """
    Local filesystem storage that mimics cloud blob storage structure.
    Files are organized in containers (directories) with flat structure using UUIDs.
    """
    
    def __init__(self, base_path: str = None):
        self.base_path = Path(base_path or settings.UPLOAD_DIR)
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Create metadata directory for storing file info
        self.metadata_path = self.base_path / ".metadata"
        self.metadata_path.mkdir(exist_ok=True)
    
    def _get_container_path(self, container: str) -> Path:
        """Get the path for a specific container"""
        container_path = self.base_path / container
        container_path.mkdir(parents=True, exist_ok=True)
        return container_path
    
    def _get_metadata_path(self, file_id: str, container: str) -> Path:
        """Get the metadata file path for a specific file"""
        return self.metadata_path / f"{container}_{file_id}.json"
    
    async def store_file(self, file_content: bytes, file_extension: str, container: str = "default") -> str:
        """
        Store a file in the specified container.
        
        Args:
            file_content: File content as bytes
            file_extension: File extension (with or without dot)
            container: Container name (similar to S3 bucket or Azure container)
            
        Returns:
            Unique file identifier (UUID)
        """
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        
        # Ensure extension starts with dot
        if file_extension and not file_extension.startswith('.'):
            file_extension = f'.{file_extension}'
        
        # Get container path
        container_path = self._get_container_path(container)
        
        # Create file path with extension for easier identification
        file_path = container_path / f"{file_id}{file_extension}"
        
        # Store the file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Store metadata
        metadata = {
            "file_id": file_id,
            "container": container,
            "file_extension": file_extension,
            "file_size": len(file_content),
            "created_at": datetime.utcnow().isoformat(),
            "file_path": str(file_path.relative_to(self.base_path))
        }
        
        import json
        metadata_path = self._get_metadata_path(file_id, container)
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)
        
        return file_id
    
    async def get_file(self, file_id: str, container: str = "default") -> Optional[bytes]:
        """Retrieve file content by ID"""
        try:
            # Get metadata to find the actual file
            metadata = await self.get_file_info(file_id, container)
            if not metadata:
                return None
            
            file_path = self.base_path / metadata["file_path"]
            
            if not file_path.exists():
                return None
            
            with open(file_path, 'rb') as f:
                return f.read()
                
        except Exception:
            return None
    
    async def delete_file(self, file_id: str, container: str = "default") -> bool:
        """Delete a file by ID"""
        try:
            # Get metadata to find the actual file
            metadata = await self.get_file_info(file_id, container)
            if not metadata:
                return False
            
            file_path = self.base_path / metadata["file_path"]
            metadata_path = self._get_metadata_path(file_id, container)
            
            # Delete the actual file
            if file_path.exists():
                file_path.unlink()
            
            # Delete metadata
            if metadata_path.exists():
                metadata_path.unlink()
            
            return True
            
        except Exception:
            return False
    
    async def file_exists(self, file_id: str, container: str = "default") -> bool:
        """Check if a file exists"""
        metadata_path = self._get_metadata_path(file_id, container)
        if not metadata_path.exists():
            return False
        
        try:
            metadata = await self.get_file_info(file_id, container)
            if not metadata:
                return False
            
            file_path = self.base_path / metadata["file_path"]
            return file_path.exists()
            
        except Exception:
            return False
    
    async def get_file_info(self, file_id: str, container: str = "default") -> Optional[dict]:
        """Get file metadata"""
        metadata_path = self._get_metadata_path(file_id, container)
        
        if not metadata_path.exists():
            return None
        
        try:
            import json
            with open(metadata_path, 'r') as f:
                return json.load(f)
        except Exception:
            return None


class StorageManager:
    """
    Storage manager that provides a unified interface for file operations.
    This can be easily configured to use different storage backends.
    """
    
    def __init__(self, backend: StorageBackend = None):
        self.backend = backend or LocalBlobStorage()
    
    async def store_file(self, file_content: bytes, file_extension: str, container: str = "uploads") -> str:
        """Store a file and return its unique identifier"""
        return await self.backend.store_file(file_content, file_extension, container)
    
    async def get_file(self, file_id: str, container: str = "uploads") -> Optional[bytes]:
        """Retrieve file content by ID"""
        return await self.backend.get_file(file_id, container)
    
    async def delete_file(self, file_id: str, container: str = "uploads") -> bool:
        """Delete a file by ID"""
        return await self.backend.delete_file(file_id, container)
    
    async def file_exists(self, file_id: str, container: str = "uploads") -> bool:
        """Check if a file exists"""
        return await self.backend.file_exists(file_id, container)
    
    async def get_file_info(self, file_id: str, container: str = "uploads") -> Optional[dict]:
        """Get file metadata"""
        return await self.backend.get_file_info(file_id, container)
    
    async def get_file_with_info(self, file_id: str, container: str = "uploads") -> Tuple[Optional[bytes], Optional[dict]]:
        """Get both file content and metadata"""
        content = await self.get_file(file_id, container)
        info = await self.get_file_info(file_id, container)
        return content, info


# Global storage manager instance
storage_manager = StorageManager()


def get_storage_manager() -> StorageManager:
    """Get the global storage manager instance"""
    return storage_manager