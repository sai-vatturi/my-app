from fastapi import APIRouter

from app.api.v1.endpoints import releases, squads, products, runbooks, files, workflows

api_router = APIRouter()

api_router.include_router(releases.router, prefix="/releases", tags=["releases"])
api_router.include_router(squads.router, prefix="/squads", tags=["squads"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(runbooks.router, prefix="/runbooks", tags=["runbooks"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
