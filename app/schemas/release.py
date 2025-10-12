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

class ProductScope(BaseModel):
    product_id: str
    scope_description: str
    fixed_versions: List[dict] = []  # [{"jira_board_id": "board1", "fixed_version": "v1.0"}]

class ReleaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    release_date: datetime
    status: str = "planned"  # planned, in_progress, completed, cancelled
    overall_scope: Optional[str] = None
    jira_release_version: Optional[str] = None
    participating_squads: List[str] = []
    product_scopes: List[ProductScope] = []  # Each product with its own scope and fixed versions

class ReleaseCreate(ReleaseBase):
    pass

class ReleaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[datetime] = None
    status: Optional[str] = None
    overall_scope: Optional[str] = None
    jira_release_version: Optional[str] = None
    participating_squads: Optional[List[str]] = None
    product_scopes: Optional[List[ProductScope]] = None

class ReleaseResponse(ReleaseBase):
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
