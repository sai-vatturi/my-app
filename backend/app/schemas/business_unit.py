from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class BusinessUnitBase(BaseModel):
    name: str = Field(..., description="Name of the business unit")
    description: Optional[str] = Field(None, description="Description of the business unit")

class BusinessUnitCreate(BusinessUnitBase):
    pass

class BusinessUnitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class BusinessUnitResponse(BusinessUnitBase):
    id: str = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
