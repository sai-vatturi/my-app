from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.services.product_service import ProductService
from app.core.database import get_database

router = APIRouter()

@router.get("/", response_model=List[ProductResponse])
async def get_products(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_database)
):
    """Get all products with pagination"""
    service = ProductService(db)
    return await service.get_products(skip=skip, limit=limit)

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db = Depends(get_database)):
    """Get a specific product by ID"""
    service = ProductService(db)
    product = await service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=ProductResponse)
async def create_product(product_data: ProductCreate, db = Depends(get_database)):
    """Create a new product"""
    service = ProductService(db)
    return await service.create_product(product_data)

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str, 
    product_data: ProductUpdate, 
    db = Depends(get_database)
):
    """Update an existing product"""
    service = ProductService(db)
    product = await service.update_product(product_id, product_data)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.delete("/{product_id}")
async def delete_product(product_id: str, db = Depends(get_database)):
    """Delete a product"""
    service = ProductService(db)
    success = await service.delete_product(product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}
