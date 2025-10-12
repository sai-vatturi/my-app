from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId

class Release:
    def __init__(self, **kwargs):
        self._id = str(kwargs.get('_id', ObjectId()))
        self.name = kwargs.get('name')
        self.description = kwargs.get('description')
        self.release_date = kwargs.get('release_date')
        self.status = kwargs.get('status', 'planned')
        self.overall_scope = kwargs.get('overall_scope')
        self.jira_release_version = kwargs.get('jira_release_version')
        self.participating_squads = kwargs.get('participating_squads', [])
        self.product_scopes = kwargs.get('product_scopes', [])
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    def to_dict(self):
        return {
            '_id': str(self._id),
            'name': self.name,
            'description': self.description,
            'release_date': self.release_date,
            'status': self.status,
            'overall_scope': self.overall_scope,
            'jira_release_version': self.jira_release_version,
            'participating_squads': self.participating_squads,
            'product_scopes': self.product_scopes,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
