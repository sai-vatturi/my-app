"""MongoDB database utilities used by the API services.

This module provides an async connection to a real MongoDB instance using
Motor (the official async Python driver for MongoDB). It exposes a minimal
set of helpers that the application depends on:

- connect_to_mongo(): establish a connection during FastAPI startup
- close_mongo_connection(): close the connection on shutdown
- get_database(): retrieve the configured database instance

All application data operations will run against the configured MongoDB
server (by default: mongodb://localhost:27017), not an in-memory store.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Any

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


@dataclass
class Database:
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[Any] = None  # AsyncIOMotorDatabase, typed as Any to avoid direct import


db = Database()


async def get_database():
    """Return the MongoDB database instance, connecting if necessary."""
    if db.database is None:
        await connect_to_mongo()
    return db.database


async def connect_to_mongo() -> None:
    """Initialise the MongoDB connection using Motor."""
    # Ensure uploads directory exists regardless of DB
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    mongo_url = settings.MONGODB_URL
    database_name = settings.DATABASE_NAME

    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    # Validate connection by pinging the server
    await client.admin.command("ping")

    db.client = client
    db.database = client[database_name]


async def close_mongo_connection() -> None:
    """Close the MongoDB connection."""
    if db.client is not None:
        db.client.close()
    db.client = None
    db.database = None
