from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId

class Product:
    def __init__(self, **kwargs):
        # Use native ObjectId for MongoDB compatibility
        self._id = kwargs.get('_id', ObjectId())
        self.name = kwargs.get('name')
        self.description = kwargs.get('description')
        self.product_owners = kwargs.get('product_owners', [])
        self.team_leads = kwargs.get('team_leads', [])
        self.principal_engineers = kwargs.get('principal_engineers', [])
        self.jira_boards = kwargs.get('jira_boards', [])
        self.squads = kwargs.get('squads', [])
        self.business_unit_id = kwargs.get('business_unit_id')
        self.application_ids = kwargs.get('application_ids', [])
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    def to_dict(self):
        return {
            '_id': self._id,
            'name': self.name,
            'description': self.description,
            'product_owners': self.product_owners,
            'team_leads': self.team_leads,
            'principal_engineers': self.principal_engineers,
            'jira_boards': self.jira_boards,
            'squads': self.squads,
            'business_unit_id': self.business_unit_id,
            'application_ids': self.application_ids,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
