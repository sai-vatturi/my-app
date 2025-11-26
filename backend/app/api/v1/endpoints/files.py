from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Form
from fastapi.responses import StreamingResponse
from typing import List, Optional
import io

from app.schemas.file import FileResponse
from app.services.file_service import FileService
from app.core.database import get_database

router = APIRouter()

@router.get("/", response_model=List[FileResponse])
async def get_files(
    skip: int = 0,
    limit: int = 100,
    file_type: Optional[str] = Query(None, description="Filter by file type"),
    release_id: Optional[str] = Query(None, description="Filter by release ID"),
    db = Depends(get_database)
):
    """Get all files with pagination and optional filters"""
    service = FileService(db)
    
    if file_type:
        return await service.get_files_by_type(file_type, skip=skip, limit=limit)
    elif release_id:
        return await service.get_files_by_release(release_id, skip=skip, limit=limit)
    else:
        return await service.get_files(skip=skip, limit=limit)

@router.get("/{file_id}", response_model=FileResponse)
async def get_file_metadata(file_id: str, db = Depends(get_database)):
    """Get file metadata by ID"""
    service = FileService(db)
    file_record = await service.get_file_by_id(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    return file_record

@router.get("/{file_id}/download")
async def download_file(
    file_id: str, 
    filename: Optional[str] = Query(None, description="Custom filename for download"),
    db = Depends(get_database)
):
    """Download file content"""
    service = FileService(db)
    
    try:
        file_content, file_metadata = await service.download_file(file_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")
    
    # Create streaming response
    
    # Determine media type
    media_type = file_metadata.get("content_type") or "application/octet-stream"
    
    # Create response with appropriate headers
    # Use provided filename if available, otherwise fallback to metadata
    final_filename = filename or file_metadata.get("original_filename") or file_metadata.get("filename", "download")
    
    return StreamingResponse(
        io.BytesIO(file_content),
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename=\"{final_filename}\"",
            "Content-Length": str(len(file_content))
        }
    )

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(...),
    release_id: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form(None),
    file_type: str = Form("attachment"),
    tags: Optional[str] = Form(None),  # Comma-separated tags
    container: str = Form("uploads"),
    db = Depends(get_database)
):
    """
    Upload a file to blob storage
    
    Args:
        file: File to upload
        release_id: Optional release ID to associate with
        uploaded_by: User who uploaded the file
        file_type: Type of file (attachment, document, image, etc.)
        tags: Comma-separated tags for categorization
        container: Storage container name
    """
    service = FileService(db)
    
    # Parse tags
    parsed_tags = []
    if tags:
        parsed_tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    
    try:
        return await service.upload_file(
            file=file,
            release_id=release_id,
            uploaded_by=uploaded_by,
            file_type=file_type,
            tags=parsed_tags,
            container=container
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.put("/{file_id}/metadata", response_model=FileResponse)
async def update_file_metadata(
    file_id: str,
    filename: Optional[str] = Form(None),
    file_type: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated tags
    release_id: Optional[str] = Form(None),
    db = Depends(get_database)
):
    """Update file metadata (does not modify stored file content)"""
    service = FileService(db)
    
    # Parse tags
    parsed_tags = None
    if tags is not None:
        parsed_tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    
    file_record = await service.update_file_metadata(
        file_id=file_id,
        filename=filename,
        file_type=file_type,
        tags=parsed_tags,
        release_id=release_id
    )
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    return file_record

@router.delete("/{file_id}")
async def delete_file(file_id: str, db = Depends(get_database)):
    """Delete a file from both storage and database"""
    service = FileService(db)
    success = await service.delete_file(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted successfully"}

@router.get("/search/by-tags", response_model=List[FileResponse])
async def search_files_by_tags(
    tags: str = Query(..., description="Comma-separated tags to search for"),
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_database)
):
    """Search files by tags"""
    service = FileService(db)
    
    # Parse tags
    search_tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    if not search_tags:
        raise HTTPException(status_code=400, detail="At least one tag must be provided")
    
    return await service.get_files_by_tags(search_tags, skip=skip, limit=limit)

@router.get("/{file_id}/storage-info")
async def get_file_storage_info(file_id: str, db = Depends(get_database)):
    """Get storage information for a file (useful for debugging)"""
    service = FileService(db)
    storage_info = await service.get_storage_info(file_id)
    
    if not storage_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    return storage_info
