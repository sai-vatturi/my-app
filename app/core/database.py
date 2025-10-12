from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import os

class Database:
    client: AsyncIOMotorClient = None
    database = None

db = Database()

async def get_database():
    return db.database

async def connect_to_mongo():
    """Create database connection"""
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.database = db.client[settings.DATABASE_NAME]
    
    # Create uploads directory if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
