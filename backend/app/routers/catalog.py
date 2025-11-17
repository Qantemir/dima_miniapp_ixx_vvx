from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import get_db
from ..schemas import (
  CatalogResponse,
  Category,
  CategoryCreate,
  CategoryUpdate,
  Product,
  ProductCreate,
  ProductUpdate,
)
from ..utils import as_object_id, serialize_doc

router = APIRouter(tags=["catalog"])


async def fetch_catalog(db: AsyncIOMotorDatabase) -> CatalogResponse:
  categories_cursor = db.categories.find()
  products_cursor = db.products.find()
  categories = [Category(**serialize_doc(doc) | {"id": str(doc["_id"])}) async for doc in categories_cursor]
  products = [Product(**serialize_doc(doc) | {"id": str(doc["_id"])}) async for doc in products_cursor]
  return CatalogResponse(categories=categories, products=products)


@router.get("/catalog", response_model=CatalogResponse)
async def get_catalog(db: AsyncIOMotorDatabase = Depends(get_db)):
  return await fetch_catalog(db)


@router.get("/admin/catalog", response_model=CatalogResponse)
async def get_admin_catalog(db: AsyncIOMotorDatabase = Depends(get_db)):
  return await fetch_catalog(db)


@router.post(
  "/admin/category",
  response_model=Category,
  status_code=status.HTTP_201_CREATED,
)
async def create_category(
  payload: CategoryCreate, db: AsyncIOMotorDatabase = Depends(get_db)
):
  existing = await db.categories.find_one({"name": payload.name})
  if existing:
    raise HTTPException(status_code=400, detail="Категория уже существует")
  result = await db.categories.insert_one(payload.dict())
  doc = await db.categories.find_one({"_id": result.inserted_id})
  return Category(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.patch("/admin/category/{category_id}", response_model=Category)
async def update_category(
  category_id: str,
  payload: CategoryUpdate,
  db: AsyncIOMotorDatabase = Depends(get_db),
):
  if not payload.dict(exclude_unset=True):
    raise HTTPException(status_code=400, detail="Нет данных для обновления")
  oid = as_object_id(category_id)
  result = await db.categories.find_one_and_update(
    {"_id": oid},
    {"$set": payload.dict(exclude_unset=True)},
    return_document=True,
  )
  if not result:
    raise HTTPException(status_code=404, detail="Категория не найдена")
  return Category(**serialize_doc(result) | {"id": str(result["_id"])})


@router.delete(
  "/admin/category/{category_id}",
  status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_category(category_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
  oid = as_object_id(category_id)
  await db.products.delete_many({"category_id": category_id})
  result = await db.categories.delete_one({"_id": oid})
  if result.deleted_count == 0:
    raise HTTPException(status_code=404, detail="Категория не найдена")
  return {"status": "ok"}


@router.post(
  "/admin/product",
  response_model=Product,
  status_code=status.HTTP_201_CREATED,
)
async def create_product(
  payload: ProductCreate, db: AsyncIOMotorDatabase = Depends(get_db)
):
  category = await db.categories.find_one({"_id": as_object_id(payload.category_id)})
  if not category:
    raise HTTPException(status_code=400, detail="Категория не найдена")
  data = payload.dict()
  if data.get("images"):
    data["image"] = data["images"][0]
  result = await db.products.insert_one(data)
  doc = await db.products.find_one({"_id": result.inserted_id})
  return Product(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.patch("/admin/product/{product_id}", response_model=Product)
async def update_product(
  product_id: str,
  payload: ProductUpdate,
  db: AsyncIOMotorDatabase = Depends(get_db),
):
  update_payload = payload.dict(exclude_unset=True)
  if "category_id" in update_payload:
    category = await db.categories.find_one({"_id": as_object_id(update_payload["category_id"])})
    if not category:
      raise HTTPException(status_code=400, detail="Категория не найдена")
  if "images" in update_payload and update_payload["images"]:
    update_payload["image"] = update_payload["images"][0]
  doc = await db.products.find_one_and_update(
    {"_id": as_object_id(product_id)},
    {"$set": update_payload},
    return_document=True,
  )
  if not doc:
    raise HTTPException(status_code=404, detail="Товар не найден")
  return Product(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.delete(
  "/admin/product/{product_id}",
  status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_product(product_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
  result = await db.products.delete_one({"_id": as_object_id(product_id)})
  if result.deleted_count == 0:
    raise HTTPException(status_code=404, detail="Товар не найден")
  return {"status": "ok"}

