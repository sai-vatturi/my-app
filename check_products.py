import asyncio
from app.core.database import connect_to_mongo, close_mongo_connection, get_database

async def main():
    await connect_to_mongo()
    db = await get_database()
    products = await db.products.find().to_list(length=None)
    print(f'Found {len(products)} products')
    for p in products:
        print(f"Product {p.get('name')}: has platform={p.get('platform')}, country={p.get('country')}, fixed_versions={p.get('fixed_versions', [])}")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
