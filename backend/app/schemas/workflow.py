from datetime import datetime
from typing import List, Optional, Any

from bson import ObjectId
from pydantic import (
    BaseModel,
    Field,
    ConfigDict,
    field_serializer,
    model_validator,
    GetJsonSchemaHandler,
)
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, core_schema


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


class WorkflowStage(BaseModel):
    name: str
    order: int = Field(ge=1)
    description: Optional[str] = None
    requires_attachment: bool = False
    attachment_mandatory: bool = False
    default_days_before_release: int = Field(default=0, ge=0)



class StageAttachment(BaseModel):
    id: str
    filename: str
    uploaded_at: datetime
    uploaded_by: Optional[str] = None


class WorkflowStageState(BaseModel):
    status: bool = False
    completed_at: Optional[datetime] = None
    attachment_id: Optional[str] = None
    attachment_filename: Optional[str] = None
    attachment_uploaded_at: Optional[datetime] = None
    attachments: List[StageAttachment] = Field(default_factory=list)
    deadline: Optional[datetime] = None  # Calculated deadline based on release date and default_days_before_release


class WorkflowTemplateBase(BaseModel):
    name: str
    release_type: str
    stages: List[WorkflowStage] = Field(default_factory=list)
    is_default: bool = False

    @model_validator(mode="after")
    def validate_stage_orders(self):
        orders = [stage.order for stage in self.stages]
        if len(orders) != len(set(orders)):
            raise ValueError("Stage orders must be unique")
        return self


class WorkflowTemplateCreate(WorkflowTemplateBase):
    pass


class WorkflowTemplateUpdate(BaseModel):
    name: Optional[str] = None
    release_type: Optional[str] = None
    stages: Optional[List[WorkflowStage]] = None


class WorkflowTemplateResponse(WorkflowTemplateBase):
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

