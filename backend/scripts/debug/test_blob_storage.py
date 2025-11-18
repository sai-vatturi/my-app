#!/usr/bin/env python3
"""
Demo script to test the blob storage functionality
"""

import asyncio
import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.storage import LocalBlobStorage, StorageManager

async def demo_blob_storage():
    """Demonstrate blob storage functionality"""
    print("🗄️ Testing Local Blob Storage")
    print("=" * 50)
    
    # Initialize storage
    storage = LocalBlobStorage()
    
    # Test file content
    test_content = b"Hello, this is a test file for blob storage!\nThis mimics cloud storage patterns."
    file_extension = ".txt"
    container = "test-container"
    
    print(f"📝 Storing test file in container: {container}")
    
    # Store file
    file_id = await storage.store_file(test_content, file_extension, container)
    print(f"✅ File stored with ID: {file_id}")
    
    # Check if file exists
    exists = await storage.file_exists(file_id, container)
    print(f"📋 File exists: {exists}")
    
    # Get file info
    info = await storage.get_file_info(file_id, container)
    print(f"ℹ️ File info: {info}")
    
    # Retrieve file content
    retrieved_content = await storage.get_file(file_id, container)
    print(f"📄 Retrieved content length: {len(retrieved_content)} bytes")
    print(f"📄 Content matches: {retrieved_content == test_content}")
    
    # Test multiple containers
    print(f"\n📁 Testing multiple containers...")
    
    containers = ["documents", "images", "temp"]
    file_ids = []
    
    for i, cont in enumerate(containers):
        content = f"Test file {i+1} in container {cont}".encode()
        fid = await storage.store_file(content, f".txt", cont)
        file_ids.append((fid, cont))
        print(f"✅ Stored file {fid} in {cont}")
    
    # List all stored files by checking info
    print(f"\n📊 File Summary:")
    for fid, cont in file_ids:
        info = await storage.get_file_info(fid, cont)
        if info:
            print(f"  - {cont}/{fid}: {info['file_size']} bytes, created {info['created_at']}")
    
    # Cleanup - delete test files
    print(f"\n🧹 Cleaning up test files...")
    
    # Delete original test file
    deleted = await storage.delete_file(file_id, container)
    print(f"🗑️ Deleted {file_id}: {deleted}")
    
    # Delete files from other containers
    for fid, cont in file_ids:
        deleted = await storage.delete_file(fid, cont)
        print(f"🗑️ Deleted {fid} from {cont}: {deleted}")
    
    print(f"\n🎉 Blob storage demo completed!")

async def demo_storage_manager():
    """Demonstrate storage manager functionality"""
    print(f"\n🔧 Testing Storage Manager")
    print("=" * 50)
    
    manager = StorageManager()
    
    # Test with different file types
    test_files = [
        (b"This is a text document", ".txt", "documents"),
        (b"Fake image content", ".jpg", "images"),
        (b"Temporary data", ".tmp", "temp")
    ]
    
    stored_files = []
    
    for content, ext, container in test_files:
        file_id = await manager.store_file(content, ext, container)
        stored_files.append((file_id, container))
        print(f"📁 Stored {ext} file in {container}: {file_id}")
    
    # Test batch retrieval
    print(f"\n📥 Testing file retrieval...")
    for file_id, container in stored_files:
        content, info = await manager.get_file_with_info(file_id, container)
        if content and info:
            print(f"✅ Retrieved {file_id}: {len(content)} bytes, {info['file_extension']}")
        else:
            print(f"❌ Failed to retrieve {file_id}")
    
    # Cleanup
    print(f"\n🧹 Cleaning up...")
    for file_id, container in stored_files:
        deleted = await manager.delete_file(file_id, container)
        print(f"🗑️ Deleted {file_id}: {deleted}")
    
    print(f"\n✨ Storage manager demo completed!")

async def main():
    """Run all demos"""
    await demo_blob_storage()
    await demo_storage_manager()
    
    print(f"\n🚀 All demos completed successfully!")
    print(f"💡 This storage system can be easily migrated to S3 or Azure Blob Storage")
    print(f"   by implementing new backend classes that inherit from StorageBackend")

if __name__ == "__main__":
    asyncio.run(main())