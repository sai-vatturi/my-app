#!/usr/bin/env python3
"""
Utility script to clear the entire Release Management Portal database.

This script will remove all data from all collections in the database.
Use with caution - this action is irreversible!
"""
import asyncio
import sys
import os
from typing import List

# Add project root to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database


async def get_all_collections(db) -> List[str]:
    """Get list of all collections in the database"""
    collections = await db.list_collection_names()
    return collections


async def clear_collection(db, collection_name: str) -> int:
    """Clear a specific collection and return the count of deleted documents"""
    collection = db[collection_name]
    
    # Count documents before deletion
    count_before = await collection.count_documents({})
    
    if count_before > 0:
        # Delete all documents in the collection
        result = await collection.delete_many({})
        return result.deleted_count
    
    return 0


async def confirm_deletion() -> bool:
    """Ask user for confirmation before proceeding with database clearing"""
    print("⚠️  WARNING: This will permanently delete ALL data from the database!")
    print("   This action cannot be undone.")
    print()
    
    response = input("Are you sure you want to proceed? Type 'DELETE ALL' to confirm: ")
    return response.strip() == "DELETE ALL"


async def main():
    """Main function to clear the database"""
    print("🗑️  Release Management Portal - Database Clear Utility")
    print("=" * 60)
    
    try:
        # Connect to database
        print("Connecting to database...")
        await connect_to_mongo()
        db = await get_database()
        
        # Get all collections
        collections = await get_all_collections(db)
        
        if not collections:
            print("✅ Database is already empty (no collections found)")
            return
        
        print(f"Found {len(collections)} collection(s):")
        total_docs = 0
        
        # Show current state
        for collection_name in collections:
            count = await db[collection_name].count_documents({})
            total_docs += count
            print(f"   📦 {collection_name}: {count} documents")
        
        print(f"\nTotal documents in database: {total_docs}")
        
        if total_docs == 0:
            print("✅ Database is already empty (no documents found)")
            return
        
        print()
        
        # Ask for confirmation
        if not await confirm_deletion():
            print("❌ Operation cancelled by user")
            return
        
        print("\n🔄 Starting database clearing...")
        
        # Clear each collection
        total_deleted = 0
        for collection_name in collections:
            print(f"   Clearing {collection_name}...", end=" ")
            deleted_count = await clear_collection(db, collection_name)
            total_deleted += deleted_count
            print(f"✅ {deleted_count} documents deleted")
        
        print(f"\n✅ Database cleared successfully!")
        print(f"   Total documents deleted: {total_deleted}")
        print(f"   Collections processed: {len(collections)}")
        
        # Verify clearance
        print("\n🔍 Verifying database is empty...")
        remaining_docs = 0
        for collection_name in collections:
            count = await db[collection_name].count_documents({})
            remaining_docs += count
        
        if remaining_docs == 0:
            print("✅ Verification passed - database is completely empty")
        else:
            print(f"⚠️  Warning: {remaining_docs} documents still remain in database")
        
    except Exception as e:
        print(f"❌ Error clearing database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        # Close database connection
        await close_mongo_connection()
        print("\n🔌 Database connection closed")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n❌ Operation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
