from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from app.schemas.business_unit import BusinessUnitCreate, BusinessUnitUpdate, BusinessUnitResponse
from app.services.business_unit_service import BusinessUnitService
from app.core.database import get_database

router = APIRouter()

@router.get("/", response_model=List[BusinessUnitResponse])
async def get_business_units(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_database)
):
    """Get all business units"""
    service = BusinessUnitService(db)
    return await service.get_business_units(skip=skip, limit=limit)

@router.post("/", response_model=BusinessUnitResponse)
async def create_business_unit(
    unit_data: BusinessUnitCreate,
    db = Depends(get_database)
):
    """Create a new business unit"""
    service = BusinessUnitService(db)
    return await service.create_business_unit(unit_data)

@router.get("/{unit_id}", response_model=BusinessUnitResponse)
async def get_business_unit(unit_id: str, db = Depends(get_database)):
    """Get a business unit by ID"""
    service = BusinessUnitService(db)
    unit = await service.get_business_unit_by_id(unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Business Unit not found")
    return unit

@router.put("/{unit_id}", response_model=BusinessUnitResponse)
async def update_business_unit(
    unit_id: str,
    unit_data: BusinessUnitUpdate,
    db = Depends(get_database)
):
    """Update a business unit"""
    service = BusinessUnitService(db)
    unit = await service.update_business_unit(unit_id, unit_data)
    if not unit:
        raise HTTPException(status_code=404, detail="Business Unit not found")
    return unit

@router.delete("/{unit_id}")
async def delete_business_unit(unit_id: str, db = Depends(get_database)):
    """Delete a business unit"""
    service = BusinessUnitService(db)
    success = await service.delete_business_unit(unit_id)
    if not success:
        raise HTTPException(status_code=404, detail="Business Unit not found")
    return {"message": "Business Unit deleted successfully"}
