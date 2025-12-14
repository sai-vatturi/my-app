from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.application import Application, ApplicationCreate, ApplicationUpdate
from app.services.application_service import ApplicationService

router = APIRouter()
application_service = ApplicationService()

@router.post("/", response_model=Application, status_code=status.HTTP_201_CREATED)
def create_application(application_in: ApplicationCreate):
    return application_service.create(application_in)

@router.get("/", response_model=List[Application])
def read_applications():
    return application_service.get_all()

@router.get("/{id}", response_model=Application)
def read_application(id: str):
    application = application_service.get(id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return application

@router.put("/{id}", response_model=Application)
def update_application(id: str, application_in: ApplicationUpdate):
    application = application_service.update(id, application_in)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return application

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(id: str):
    success = application_service.delete(id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
