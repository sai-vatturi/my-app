from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

class File:
    def __init__(self, **kwargs):
        self._id = str(kwargs.get('_id', ObjectId()))
        self.filename = kwargs.get('filename')
        self.original_filename = kwargs.get('original_filename')
        self.file_path = kwargs.get('file_path')
        self.file_size = kwargs.get('file_size')
        self.content_type = kwargs.get('content_type')
        self.release_id = kwargs.get('release_id')
        self.file_type = kwargs.get('file_type')
        self.description = kwargs.get('description')
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    def to_dict(self):
        return {
            '_id': str(self._id),
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'content_type': self.content_type,
            'release_id': self.release_id,
            'file_type': self.file_type,
            'description': self.description,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
