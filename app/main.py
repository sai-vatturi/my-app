from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.startup import startup_event, shutdown_event

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Release Management Portal API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Add startup and shutdown events
app.add_event_handler("startup", startup_event)
app.add_event_handler("shutdown", shutdown_event)

@app.get("/health", tags=["health"]) 
async def health():
    return {"status": "ok", "version": settings.VERSION}
