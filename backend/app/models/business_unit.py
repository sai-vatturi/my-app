from datetime import datetime, timezone
from bson import ObjectId

class BusinessUnit:
    def __init__(self, **kwargs):
        self._id = kwargs.get('_id', ObjectId())
        self.name = kwargs.get('name')
        self.description = kwargs.get('description')
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    def to_dict(self):
        return {
            '_id': self._id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
