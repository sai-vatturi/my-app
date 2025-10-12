from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.schemas.squad import SquadCreate, SquadUpdate, SquadResponse
from app.services.squad_service import SquadService
from app.core.database import get_database

router = APIRouter()

@router.get("/", response_model=List[SquadResponse])
async def get_squads(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_database)
):
    """Get all squads with pagination"""
    service = SquadService(db)
    return await service.get_squads(skip=skip, limit=limit)

@router.get("/{squad_id}", response_model=SquadResponse)
async def get_squad(squad_id: str, db = Depends(get_database)):
    """Get a specific squad by ID"""
    service = SquadService(db)
    squad = await service.get_squad_by_id(squad_id)
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")
    return squad

@router.post("/", response_model=SquadResponse)
async def create_squad(squad_data: SquadCreate, db = Depends(get_database)):
    """Create a new squad"""
    service = SquadService(db)
    return await service.create_squad(squad_data)

@router.put("/{squad_id}", response_model=SquadResponse)
async def update_squad(
    squad_id: str, 
    squad_data: SquadUpdate, 
    db = Depends(get_database)
):
    """Update an existing squad"""
    service = SquadService(db)
    squad = await service.update_squad(squad_id, squad_data)
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")
    return squad

@router.delete("/{squad_id}")
async def delete_squad(squad_id: str, db = Depends(get_database)):
    """Delete a squad"""
    service = SquadService(db)
    success = await service.delete_squad(squad_id)
    if not success:
        raise HTTPException(status_code=404, detail="Squad not found")
    return {"message": "Squad deleted successfully"}
