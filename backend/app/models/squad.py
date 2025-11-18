from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId

class Squad:
    def __init__(self, **kwargs):
        self._id = kwargs.get('_id', ObjectId())
        self.name = kwargs.get('name')
        self.description = kwargs.get('description')
        self.team_leads = kwargs.get('team_leads', [])
        self.principal_engineers = kwargs.get('principal_engineers', [])
        self.products = kwargs.get('products', [])
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    def to_dict(self):
        return {
            '_id': self._id,
            'name': self.name,
            'description': self.description,
            'team_leads': self.team_leads,
            'principal_engineers': self.principal_engineers,
            'products': self.products,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
