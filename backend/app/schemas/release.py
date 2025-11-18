from pydantic import BaseModel, Field, GetJsonSchemaHandler, ConfigDict, field_serializer
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, core_schema
from typing import Optional, List, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum

class ReleaseType(str, Enum):
    MAJOR_RELEASE = "Major release"
    HOTFIX = "Hotfix"
    DATA_PATCH = "Data patch"
    HOTFIX_DATA_PATCH = "Hotfix & Data patch"

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
    pocs: List[str] = Field(default_factory=list)  # Multiple Points of Contact for this product
    fixed_versions: List[FixedVersionInfo] = Field(default_factory=list)

class ReleaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    release_date: datetime
    release_type: ReleaseType = ReleaseType.MAJOR_RELEASE  # Type of release to determine workflow
    status: str = "planned"  # planned, in_progress, completed, cancelled
    overall_scope: Optional[str] = None
    jira_release_version: Optional[str] = None  # Optional field
    chg_number: Optional[str] = None  # Change Request number
    products: List[ReleaseProduct] = Field(default_factory=list)  # Products participating in this release with their details
    workflow_id: Optional[str] = None  # Selected workflow for this release

class ReleaseCreate(ReleaseBase):
    pass

class ReleaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[datetime] = None
    release_type: Optional[ReleaseType] = None
    status: Optional[str] = None
    overall_scope: Optional[str] = None
    jira_release_version: Optional[str] = None
    chg_number: Optional[str] = None
    products: Optional[List[ReleaseProduct]] = None
    workflow_id: Optional[str] = None
    product_workflow_states: Optional[dict] = None

class ReleaseResponse(ReleaseBase):
    id: PyObjectId = Field(alias="_id")
    product_workflow_states: dict = Field(default_factory=dict)  # Workflow states for each product
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    @field_serializer("id", when_used="json")
    def serialize_id(self, value: PyObjectId) -> str:
        return str(value)
