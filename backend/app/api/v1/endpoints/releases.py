from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Body
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.schemas.release import ReleaseCreate, ReleaseUpdate, ReleaseResponse, TimelineUpdate
from app.services.release_service import ReleaseService
from app.core.database import get_database

router = APIRouter()

@router.get("/", response_model=List[ReleaseResponse])
async def get_releases(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    db = Depends(get_database)
):
    """Get all releases with pagination and optional date range filtering"""
    service = ReleaseService(db)
    
    return await service.get_releases(
        skip=skip, 
        limit=limit, 
        start_date=start_date, 
        end_date=end_date
    )

@router.get("/{release_id}", response_model=ReleaseResponse)
async def get_release(release_id: str, db = Depends(get_database)):
    """Get a specific release by ID"""
    service = ReleaseService(db)
    release = await service.get_release_by_id(release_id)
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    return release

@router.post("/", response_model=ReleaseResponse)
async def create_release(release_data: ReleaseCreate, db = Depends(get_database)):
    """Create a new release"""
    service = ReleaseService(db)
    return await service.create_release(release_data)

@router.put("/{release_id}", response_model=ReleaseResponse)
async def update_release(
    release_id: str, 
    release_data: ReleaseUpdate, 
    db = Depends(get_database)
):
    """Update an existing release"""
    service = ReleaseService(db)
    release = await service.update_release(release_id, release_data)
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    return release

@router.delete("/{release_id}")
async def delete_release(release_id: str, db = Depends(get_database)):
    """Delete a release"""
    service = ReleaseService(db)
    success = await service.delete_release(release_id)
    if not success:
        raise HTTPException(status_code=404, detail="Release not found")
    return {"message": "Release deleted successfully"}

@router.post("/{release_id}/products/{product_id}/advance-stage", response_model=ReleaseResponse)
async def advance_product_stage(
    release_id: str,
    product_id: str,
    db = Depends(get_database)
):
    """Advance a product to the next workflow stage"""
    service = ReleaseService(db)
    return await service.advance_product_stage(release_id, product_id)

@router.post("/{release_id}/products/{product_id}/stages/{stage_order}/attachment", response_model=ReleaseResponse)
async def upload_product_stage_attachment(
    release_id: str,
    product_id: str,
    stage_order: int,
    file: UploadFile = File(...),
    db = Depends(get_database)
):
    """Upload an attachment for a specific workflow stage of a product"""
    service = ReleaseService(db)
    return await service.upload_product_stage_attachment(
        release_id=release_id,
        product_id=product_id,
        stage_order=stage_order,
        file=file
    )

@router.put("/{release_id}/stages/{stage_order}/timeline", response_model=ReleaseResponse)
async def update_stage_timeline(
    release_id: str,
    stage_order: int,
    timeline_data: TimelineUpdate = Body(...),
    db = Depends(get_database)
):
    """Update timeline for a stage. If product_id is None in timeline_data, update for all products.
    Either deadline (direct date/time) or days_before_release must be provided.
    """
    service = ReleaseService(db)
    return await service.update_stage_timeline(
        release_id=release_id,
        product_id=timeline_data.product_id,
        stage_order=stage_order,
        deadline=timeline_data.deadline,
        days_before_release=timeline_data.days_before_release
    )
