from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId

class Squad:
    def __init__(self, **kwargs):
        self._id = str(kwargs.get('_id', ObjectId()))
        self.name = kwargs.get('name')
        self.description = kwargs.get('description')
        self.jira_board_id = kwargs.get('jira_board_id')
        self.team_lead = kwargs.get('team_lead')
        self.product_owner = kwargs.get('product_owner')
        self.products = kwargs.get('products', [])
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    def to_dict(self):
        return {
            '_id': str(self._id),
            'name': self.name,
            'description': self.description,
            'jira_board_id': self.jira_board_id,
            'team_lead': self.team_lead,
            'product_owner': self.product_owner,
            'products': self.products,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
