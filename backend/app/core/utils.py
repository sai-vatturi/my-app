from datetime import datetime, timezone, timedelta
from typing import Optional, List, Set, Any
from bson import ObjectId

def get_utc_now() -> datetime:
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)

def validate_object_id(id_str: str) -> Optional[ObjectId]:
    """Validate and convert string to ObjectId"""
    try:
        return ObjectId(id_str)
    except:
        return None

def calculate_deadline(release_date: datetime, days_before: int) -> datetime:
    """
    Calculate deadline date by subtracting business days (skipping weekends) 
    from a release date.
    
    Args:
        release_date: The anchor date (release date)
        days_before: Number of business days before release
        
    Returns:
        Datetime set to 18:00 SGT (which is UTC+8, so 10:00 UTC) on the calculated day.
        Actually, existing logic sets it to 18:00 local time implicitly by replacing hour=18.
        Let's preserve existing behavior: returns naive datetime or timezone aware depending on input, 
        but with hour=18.
    """
    target_date = release_date
    days_subtracted = 0
    while days_subtracted < days_before:
        target_date = target_date - timedelta(days=1)
        # Skip weekends (0 = Monday, 6 = Sunday). 
        # Python weekday(): 0=Monday,... 5=Saturday, 6=Sunday.
        # Logic in ReleaseService was: if target_date.weekday() < 5: days_subtracted += 1
        if target_date.weekday() < 5:  # Monday-Friday
            days_subtracted += 1
            
    # Set default time to 6 PM (18:00)
    # Note: timezone handling in original code was a bit mixed, often stripping tzinfo via replace if naive
    return target_date.replace(hour=18, minute=0, second=0, microsecond=0)

async def update_relationship(
    db,
    collection_name: str,
    item_id: str,
    field_name: str,
    old_items: Set[str],
    new_items: Set[str]
) -> None:
    """
    Generic helper to update many-to-many relationships.
    
    Args:
        db: Database instance
        collection_name: Name of the related collection (e.g. 'squads', 'products')
        item_id: ID of the item being updated (e.g. product_id when updating squads)
        field_name: Array field in related collection to update (e.g. 'products' in squads)
        old_items: Set of related IDs before update
        new_items: Set of related IDs after update
    """
    collection = getattr(db, collection_name)
    now = get_utc_now()
    
    # Remove item_id from entities that are no longer associated
    removed_ids = old_items - new_items
    for rid in removed_ids:
        await collection.update_one(
            {"_id": ObjectId(rid)},
            {
                "$pull": {field_name: item_id},
                "$set": {"updated_at": now}
            }
        )
        
    # Add item_id to new entities
    added_ids = new_items - old_items
    for rid in added_ids:
        # Check if already exists to avoid duplicates is handled by $addToSet usually, 
        # but logic often uses manual check + array append. 
        # Using $addToSet is safer and cleaner.
        await collection.update_one(
            {"_id": ObjectId(rid)},
            {
                "$addToSet": {field_name: item_id},
                "$set": {"updated_at": now}
            }
        )
