from pydantic import BaseModel, Field, GetJsonSchemaHandler, ConfigDict, field_serializer
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, core_schema
from typing import Optional, List, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: Any
    ) -> CoreSchema:
        return core_schema.no_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(
        cls, field_schema: JsonSchemaValue, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return {"type": "string"}

class WorkflowStageBase(BaseModel):
    name: str
    order: int = 0
    description: Optional[str] = None
    requires_attachment: bool = False
    attachment_mandatory: bool = False
    default_days_before_release: int = 0

class WorkflowStageCreate(WorkflowStageBase):
    pass

class WorkflowStageUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None
    description: Optional[str] = None
    requires_attachment: Optional[bool] = None
    attachment_mandatory: Optional[bool] = None
    default_days_before_release: Optional[int] = None

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    stages: List[WorkflowStageBase] = Field(default_factory=list)

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    stages: Optional[List[WorkflowStageBase]] = None

class WorkflowResponse(WorkflowBase):
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    @field_serializer("id", when_used="json")
    def serialize_id(self, value: PyObjectId) -> str:
        return str(value)

class ProductWorkflowState(BaseModel):
    """Tracks a product's progress through workflow stages"""
    current_stage_index: int = 0
    stage_dates: dict = Field(default_factory=dict)  # {stage_index: ISO date string}
    attachments: dict = Field(default_factory=dict)  # {stage_index: [file_id1, file_id2, ...]}
    completed: bool = False  # Whether product has completed all stages
