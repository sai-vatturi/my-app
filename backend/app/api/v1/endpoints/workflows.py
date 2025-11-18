from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.database import get_database
from app.schemas.workflow import (
    WorkflowTemplateCreate,
    WorkflowTemplateUpdate,
    WorkflowTemplateResponse,
)
from app.services.workflow_service import WorkflowService

router = APIRouter()


@router.get("/", response_model=List[WorkflowTemplateResponse])
async def list_workflows(
    release_type: Optional[str] = Query(None, description="Filter by release type"),
    db=Depends(get_database),
):
    service = WorkflowService(db)
    return await service.get_workflows(release_type=release_type)


@router.get("/{workflow_id}", response_model=WorkflowTemplateResponse)
async def get_workflow(workflow_id: str, db=Depends(get_database)):
    service = WorkflowService(db)
    workflow = await service.get_workflow_by_id(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.post(
    "/", response_model=WorkflowTemplateResponse, status_code=status.HTTP_201_CREATED
)
async def create_workflow(workflow_data: WorkflowTemplateCreate, db=Depends(get_database)):
    service = WorkflowService(db)
    return await service.create_workflow(workflow_data)


@router.put("/{workflow_id}", response_model=WorkflowTemplateResponse)
async def update_workflow(
    workflow_id: str, workflow_data: WorkflowTemplateUpdate, db=Depends(get_database)
):
    service = WorkflowService(db)
    return await service.update_workflow(workflow_id, workflow_data)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(workflow_id: str, db=Depends(get_database)):
    service = WorkflowService(db)
    await service.delete_workflow(workflow_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

