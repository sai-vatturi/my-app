from pydantic import BaseModel, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, core_schema
from typing import Optional, List, Dict, Any
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

class RunbookBase(BaseModel):
    release_id: str
    application_name: str
    build_version: str
    release_version: str
    product_ids: List[str] = []  # Multiple products this runbook applies to
    point_of_contact: Dict[str, str] = {}  # PE, PO contacts
    change_request_details: Optional[str] = None
    cab_approval_status: str = "pending"  # pending, approved, rejected
    pre_deployment_activities: List[Dict[str, Any]] = []
    post_deployment_activities: List[Dict[str, Any]] = []
    deployment_steps: List[Dict[str, Any]] = []
    resources: List[str] = []  # Application teams, SCM, DevOps, etc.
    external_team_details: Optional[str] = None

class RunbookCreate(RunbookBase):
    pass

class RunbookUpdate(BaseModel):
    application_name: Optional[str] = None
    build_version: Optional[str] = None
    release_version: Optional[str] = None
    product_ids: Optional[List[str]] = None
    point_of_contact: Optional[Dict[str, str]] = None
    change_request_details: Optional[str] = None
    cab_approval_status: Optional[str] = None
    pre_deployment_activities: Optional[List[Dict[str, Any]]] = None
    post_deployment_activities: Optional[List[Dict[str, Any]]] = None
    deployment_steps: Optional[List[Dict[str, Any]]] = None
    resources: Optional[List[str]] = None
    external_team_details: Optional[str] = None

class RunbookResponse(RunbookBase):
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
