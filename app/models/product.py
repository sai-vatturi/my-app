from datetime import datetime
from typing import List, Optional
from bson import ObjectId

class Product:
    def __init__(self, **kwargs):
        self._id = kwargs.get('_id', ObjectId())
        self.name = kwargs.get('name')
        self.description = kwargs.get('description')
        self.product_owner = kwargs.get('product_owner')
        self.technical_lead = kwargs.get('technical_lead')
        self.jira_boards = kwargs.get('jira_boards', [])
        self.squads = kwargs.get('squads', [])
        self.fixed_versions = kwargs.get('fixed_versions', [])
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())

    def to_dict(self):
        return {
            '_id': self._id,
            'name': self.name,
            'description': self.description,
            'product_owner': self.product_owner,
            'technical_lead': self.technical_lead,
            'jira_boards': self.jira_boards,
            'squads': self.squads,
            'fixed_versions': self.fixed_versions,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
