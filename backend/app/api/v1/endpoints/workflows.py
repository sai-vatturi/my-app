from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from app.services.workflow_service import WorkflowService
from app.core.database import get_database

router = APIRouter()

@router.get("/", response_model=List[WorkflowResponse])
async def get_workflows(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_database)
):
    """Get all workflows with pagination"""
    service = WorkflowService(db)
    return await service.get_workflows(skip=skip, limit=limit)

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: str, db = Depends(get_database)):
    """Get a specific workflow by ID"""
    service = WorkflowService(db)
    workflow = await service.get_workflow_by_id(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(workflow_data: WorkflowCreate, db = Depends(get_database)):
    """Create a new workflow"""
    service = WorkflowService(db)
    return await service.create_workflow(workflow_data)

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowUpdate,
    db = Depends(get_database)
):
    """Update an existing workflow"""
    service = WorkflowService(db)
    workflow = await service.update_workflow(workflow_id, workflow_data)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, db = Depends(get_database)):
    """Delete a workflow"""
    service = WorkflowService(db)
    deleted = await service.delete_workflow(workflow_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted successfully"}
