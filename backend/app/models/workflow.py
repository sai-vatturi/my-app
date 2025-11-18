from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId

class WorkflowStage:
    def __init__(self, **kwargs):
        self.name = kwargs.get('name')
        self.order = kwargs.get('order', 0)
        self.description = kwargs.get('description')
        self.requires_attachment = kwargs.get('requires_attachment', False)
        self.attachment_mandatory = kwargs.get('attachment_mandatory', False)
        self.default_days_before_release = kwargs.get('default_days_before_release', 0)

    def to_dict(self):
        return {
            'name': self.name,
            'order': self.order,
            'description': self.description,
            'requires_attachment': self.requires_attachment,
            'attachment_mandatory': self.attachment_mandatory,
            'default_days_before_release': self.default_days_before_release
        }

    @classmethod
    def from_dict(cls, data):
        return cls(**data)

class Workflow:
    def __init__(self, **kwargs):
        self._id = kwargs.get('_id', ObjectId())
        self.name = kwargs.get('name')
        self.description = kwargs.get('description')
        self.stages = kwargs.get('stages', [])
        self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
        self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    def to_dict(self):
        return {
            '_id': self._id,
            'name': self.name,
            'description': self.description,
            'stages': [stage.to_dict() for stage in self.stages],
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data):
        stages = [WorkflowStage.from_dict(stage) for stage in data.get('stages', [])]
        data['stages'] = stages
        return cls(**data)
