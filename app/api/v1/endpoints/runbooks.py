from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.schemas.runbook import RunbookCreate, RunbookUpdate, RunbookResponse
from app.services.runbook_service import RunbookService
from app.core.database import get_database

router = APIRouter()

@router.get("/", response_model=List[RunbookResponse])
async def get_runbooks(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_database)
):
    """Get all runbooks with pagination"""
    service = RunbookService(db)
    return await service.get_runbooks(skip=skip, limit=limit)

@router.get("/{runbook_id}", response_model=RunbookResponse)
async def get_runbook(runbook_id: str, db = Depends(get_database)):
    """Get a specific runbook by ID"""
    service = RunbookService(db)
    runbook = await service.get_runbook_by_id(runbook_id)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")
    return runbook

@router.post("/", response_model=RunbookResponse)
async def create_runbook(runbook_data: RunbookCreate, db = Depends(get_database)):
    """Create a new runbook"""
    service = RunbookService(db)
    return await service.create_runbook(runbook_data)

@router.put("/{runbook_id}", response_model=RunbookResponse)
async def update_runbook(
    runbook_id: str, 
    runbook_data: RunbookUpdate, 
    db = Depends(get_database)
):
    """Update an existing runbook"""
    service = RunbookService(db)
    runbook = await service.update_runbook(runbook_id, runbook_data)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")
    return runbook

@router.delete("/{runbook_id}")
async def delete_runbook(runbook_id: str, db = Depends(get_database)):
    """Delete a runbook"""
    service = RunbookService(db)
    success = await service.delete_runbook(runbook_id)
    if not success:
        raise HTTPException(status_code=404, detail="Runbook not found")
    return {"message": "Runbook deleted successfully"}
