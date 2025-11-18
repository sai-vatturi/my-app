from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

class File:
    def __init__(self, **kwargs):
        self._id = kwargs.get('_id', ObjectId())
        self.filename = kwargs.get('filename')  # Display filename
        self.original_filename = kwargs.get('original_filename')  # Original uploaded filename
        self.storage_id = kwargs.get('storage_id')  # Blob storage identifier
        self.container = kwargs.get('container', 'uploads')  # Storage container
        self.file_size = kwargs.get('file_size', 0)
        self.content_type = kwargs.get('content_type')
        self.file_type = kwargs.get('file_type', 'attachment')  # attachment, document, image, etc.
        self.release_id = kwargs.get('release_id')
        self.uploaded_by = kwargs.get('uploaded_by')  # User who uploaded the file
        self.tags = kwargs.get('tags', [])  # Optional tags for categorization
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    def to_dict(self):
        return {
            '_id': self._id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'storage_id': self.storage_id,
            'container': self.container,
            'file_size': self.file_size,
            'content_type': self.content_type,
            'file_type': self.file_type,
            'release_id': self.release_id,
            'uploaded_by': self.uploaded_by,
            'tags': self.tags,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
