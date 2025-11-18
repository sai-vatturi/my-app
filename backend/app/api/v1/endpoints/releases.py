from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime

from app.schemas.release import ReleaseCreate, ReleaseUpdate, ReleaseResponse
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
    
    # Parse date strings if provided
    start_datetime = None
    end_datetime = None
    
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            # Set to end of day
            end_datetime = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    
    return await service.get_releases(
        skip=skip, 
        limit=limit, 
        start_date=start_datetime, 
        end_date=end_datetime
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
