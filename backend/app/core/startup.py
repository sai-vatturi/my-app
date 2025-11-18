from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.services.workflow_service import WorkflowService

async def startup_event():
    """Application startup event"""
    await connect_to_mongo()
    database = await get_database()
    workflow_service = WorkflowService(database)
    await workflow_service.ensure_default_workflows()
    
async def shutdown_event():
    """Application shutdown event"""
    await close_mongo_connection()
