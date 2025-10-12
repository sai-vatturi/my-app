from pydantic import BaseModel, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, core_schema
from typing import Optional, Any
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

class FileBase(BaseModel):
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    content_type: str
    release_id: Optional[str] = None
    file_type: str  # email, script, form, test_result, etc.
    description: Optional[str] = None

class FileResponse(FileBase):
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
