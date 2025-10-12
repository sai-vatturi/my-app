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

class SquadBase(BaseModel):
    name: str
    description: Optional[str] = None
    jira_board_id: Optional[str] = None
    team_lead: Optional[str] = None
    product_owner: Optional[str] = None
    products: List[str] = Field(default_factory=list)

class SquadCreate(SquadBase):
    pass

class SquadUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    jira_board_id: Optional[str] = None
    team_lead: Optional[str] = None
    product_owner: Optional[str] = None
    products: Optional[List[str]] = None

class SquadResponse(SquadBase):
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
