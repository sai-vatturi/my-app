from app.core.database import connect_to_mongo, close_mongo_connection

async def startup_event():
    """Application startup event"""
    await connect_to_mongo()

async def shutdown_event():
    """Application shutdown event"""
    await close_mongo_connection()
