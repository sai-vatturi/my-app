from pydantic import BaseModel, Field, GetJsonSchemaHandler
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
    fixed_version: Optional[str] = None

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    product_owner: Optional[str] = None
    technical_lead: Optional[str] = None
    jira_boards: List[JiraBoardInfo] = []  # Multiple JIRA boards per product
    squads: List[str] = []
    fixed_versions: List[str] = []  # Standalone fixed versions

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    product_owner: Optional[str] = None
    technical_lead: Optional[str] = None
    jira_boards: Optional[List[JiraBoardInfo]] = None
    squads: Optional[List[str]] = None
    fixed_versions: Optional[List[str]] = None

class ProductResponse(ProductBase):
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
