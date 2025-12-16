from pydantic import BaseModel, Field, GetJsonSchemaHandler, ConfigDict, field_serializer
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, core_schema
from typing import Optional, List, Any, Dict
from datetime import datetime
from bson import ObjectId
from app.schemas.workflow import WorkflowStageState

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

class FixedVersionInfo(BaseModel):
    fixed_version: str
    jira_board_id: str

class ReleaseProduct(BaseModel):
    product_id: str
    scope_description: Optional[str] = None
    new_features: Optional[str] = None
    enhancements: Optional[str] = None
    key_defect_fixes: Optional[str] = None
    deferred_items: Optional[str] = None
    pocs: List[str] = Field(default_factory=list)  # Multiple Points of Contact for this product
    fixed_versions: List[FixedVersionInfo] = Field(default_factory=list)
    workflow_states: Dict[str, WorkflowStageState] = Field(default_factory=dict)

class CustomAttachment(BaseModel):
    id: str
    filename: str
    uploaded_at: datetime
    uploaded_by: Optional[str] = None

class ReleaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    release_date: datetime
    release_type: str = Field(default="Major release")
    status: str = "planned"  # planned, in_progress, completed, cancelled
    overall_scope: Optional[str] = None
    chg_number: Optional[str] = None  # Change Request number
    products: List[ReleaseProduct] = Field(default_factory=list)
    workflow_states: Dict[str, WorkflowStageState] = Field(default_factory=dict)
    custom_attachments: List[CustomAttachment] = Field(default_factory=list)
    business_unit_id: Optional[str] = None

class ReleaseCreate(ReleaseBase):
    pass

class ReleaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[datetime] = None
    release_type: Optional[str] = None
    status: Optional[str] = None
    overall_scope: Optional[str] = None
    chg_number: Optional[str] = None
    products: Optional[List[ReleaseProduct]] = None
    business_unit_id: Optional[str] = None

class TimelineUpdate(BaseModel):
    product_id: Optional[str] = None
    deadline: Optional[datetime] = None  # Direct deadline date/time
    days_before_release: Optional[int] = None  # Alternative: days before release

class ReleaseResponse(ReleaseBase):
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
