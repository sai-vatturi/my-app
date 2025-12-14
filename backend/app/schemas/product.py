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

class JiraBoardInfo(BaseModel):
    board_id: str
    board_name: str

class ProductBase(BaseModel):
    name: str  # Only mandatory field
    description: Optional[str] = None
    product_owners: Optional[List[str]] = Field(default_factory=list)  # Multiple product owners (optional)
    team_leads: Optional[List[str]] = Field(default_factory=list)  # Multiple team leads (optional)
    principal_engineers: Optional[List[str]] = Field(default_factory=list)  # Multiple principal engineers (optional)
    jira_boards: List[JiraBoardInfo] = Field(default_factory=list)  # Required JIRA boards per product
    squads: Optional[List[str]] = Field(default_factory=list)  # Optional squads
    business_unit_id: Optional[str] = None
    application_ids: List[str] = Field(default_factory=list)  # Link to applications

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    product_owners: Optional[List[str]] = None
    team_leads: Optional[List[str]] = None
    principal_engineers: Optional[List[str]] = None
    jira_boards: Optional[List[JiraBoardInfo]] = None
    squads: Optional[List[str]] = None
    business_unit_id: Optional[str] = None
    application_ids: Optional[List[str]] = None

class ProductResponse(ProductBase):
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
