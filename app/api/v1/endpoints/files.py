from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List

from app.schemas.file import FileResponse
from app.services.file_service import FileService
from app.core.database import get_database

router = APIRouter()

@router.get("/", response_model=List[FileResponse])
async def get_files(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_database)
):
    """Get all files with pagination"""
    service = FileService(db)
    return await service.get_files(skip=skip, limit=limit)

@router.get("/{file_id}", response_model=FileResponse)
async def get_file(file_id: str, db = Depends(get_database)):
    """Get a specific file by ID"""
    service = FileService(db)
    file = await service.get_file_by_id(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    release_id: str = None,
    db = Depends(get_database)
):
    """Upload a file"""
    service = FileService(db)
    return await service.upload_file(file, release_id)

@router.delete("/{file_id}")
async def delete_file(file_id: str, db = Depends(get_database)):
    """Delete a file"""
    service = FileService(db)
    success = await service.delete_file(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted successfully"}
