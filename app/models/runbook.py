from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId

class Runbook:
    def __init__(self, **kwargs):
        self._id = kwargs.get('_id', ObjectId())
        self.release_id = kwargs.get('release_id')
        self.application_name = kwargs.get('application_name')
        self.build_version = kwargs.get('build_version')
        self.release_version = kwargs.get('release_version')
        self.product_ids = kwargs.get('product_ids', [])
        self.point_of_contact = kwargs.get('point_of_contact', {})
        self.change_request_details = kwargs.get('change_request_details')
        self.cab_approval_status = kwargs.get('cab_approval_status', 'pending')
        self.pre_deployment_activities = kwargs.get('pre_deployment_activities', [])
        self.post_deployment_activities = kwargs.get('post_deployment_activities', [])
        self.deployment_steps = kwargs.get('deployment_steps', [])
        self.resources = kwargs.get('resources', [])
        self.external_team_details = kwargs.get('external_team_details')
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())

    def to_dict(self):
        return {
            '_id': self._id,
            'release_id': self.release_id,
            'application_name': self.application_name,
            'build_version': self.build_version,
            'release_version': self.release_version,
            'product_ids': self.product_ids,
            'point_of_contact': self.point_of_contact,
            'change_request_details': self.change_request_details,
            'cab_approval_status': self.cab_approval_status,
            'pre_deployment_activities': self.pre_deployment_activities,
            'post_deployment_activities': self.post_deployment_activities,
            'deployment_steps': self.deployment_steps,
            'resources': self.resources,
            'external_team_details': self.external_team_details,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)
