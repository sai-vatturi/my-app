from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId

class Release:
    def __init__(self, **kwargs):
        self._id = kwargs.get('_id', ObjectId())
        self.name = kwargs.get('name')
        self.description = kwargs.get('description')
        self.release_date = kwargs.get('release_date')
        self.release_type = kwargs.get('release_type', 'Major release')
        self.status = kwargs.get('status', 'planned')
        self.overall_scope = kwargs.get('overall_scope')
        self.jira_release_version = kwargs.get('jira_release_version')
        self.chg_number = kwargs.get('chg_number')
        # Products in the release
        self.products = kwargs.get('products', [])
        # Release-level workflow states (default timelines)
        self.workflow_states = kwargs.get('workflow_states', {})
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    def to_dict(self):
        return {
            '_id': self._id,
            'name': self.name,
            'description': self.description,
            'release_date': self.release_date,
            'release_type': self.release_type,
            'status': self.status,
            'overall_scope': self.overall_scope,
            'jira_release_version': self.jira_release_version,
            'chg_number': self.chg_number,
            'products': self.products,
            'workflow_states': self.workflow_states,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
