from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, GetJsonSchemaHandler, ConfigDict, field_serializer
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, core_schema
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: Any
    ) -> CoreSchema:
        return core_schema.no_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, v):
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        if hasattr(v, 'to_str'): # Handle existing ObjectId
             return ObjectId(str(v))
        if isinstance(v, ObjectId):
            return v
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(
        cls, field_schema: JsonSchemaValue, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return {"type": "string"}

class ApplicationBase(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None

class Application(ApplicationBase):
    id: PyObjectId = Field(alias='_id')
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    @field_serializer("id", when_used="json")
    def serialize_id(self, value: PyObjectId) -> str:
        return str(value)
