from typing import List, Sequence

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

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
from ..auth import verify_admin

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
async def get_admin_catalog(
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  return await fetch_catalog(db)


def _build_id_candidates(raw_id: str) -> Sequence[object]:
  candidates: set[object] = {raw_id}
  if ObjectId.is_valid(raw_id):
    oid = ObjectId(raw_id)
    candidates.add(oid)
    candidates.add(str(oid))
  return list(candidates)


@router.post(
  "/admin/category",
  response_model=Category,
  status_code=status.HTTP_201_CREATED,
)
async def create_category(
  payload: CategoryCreate,
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  if not payload.name or not payload.name.strip():
    raise HTTPException(status_code=400, detail="Название категории не может быть пустым")
  
  existing = await db.categories.find_one({"name": payload.name.strip()})
  if existing:
    raise HTTPException(status_code=400, detail="Категория уже существует")
  
  category_data = {"name": payload.name.strip()}
  result = await db.categories.insert_one(category_data)
  doc = await db.categories.find_one({"_id": result.inserted_id})
  if not doc:
    raise HTTPException(status_code=500, detail="Ошибка при создании категории")
  return Category(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.patch("/admin/category/{category_id}", response_model=Category)
async def update_category(
  category_id: str,
  payload: CategoryUpdate,
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  update_data = payload.dict(exclude_unset=True)
  if not update_data:
    raise HTTPException(status_code=400, detail="Нет данных для обновления")

  category_doc = await db.categories.find_one({"_id": {"$in": _build_id_candidates(category_id)}})
  if not category_doc:
    raise HTTPException(status_code=404, detail="Категория не найдена")

  if "name" in update_data and update_data["name"] is not None:
    update_data["name"] = update_data["name"].strip()
    if not update_data["name"]:
      raise HTTPException(status_code=400, detail="Название категории не может быть пустым")

    existing = await db.categories.find_one({
      "name": update_data["name"],
      "_id": {"$ne": category_doc["_id"]},
    })
    if existing:
      raise HTTPException(status_code=400, detail="Категория с таким названием уже существует")

  result = await db.categories.find_one_and_update(
    {"_id": category_doc["_id"]},
    {"$set": update_data},
    return_document=ReturnDocument.AFTER,
  )
  if not result:
    raise HTTPException(status_code=404, detail="Категория не найдена")
  return Category(**serialize_doc(result) | {"id": str(result["_id"])})


@router.delete(
  "/admin/category/{category_id}",
  status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_category(
  category_id: str,
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  category_doc = await db.categories.find_one({"_id": {"$in": _build_id_candidates(category_id)}})
  if not category_doc:
    raise HTTPException(status_code=404, detail="Категория не найдена")

  cleanup_values: set[object] = {
    category_id,
    str(category_doc["_id"]),
  }
  if isinstance(category_doc["_id"], ObjectId):
    cleanup_values.add(category_doc["_id"])

  await db.products.delete_many({"category_id": {"$in": list(cleanup_values)}})

  delete_result = await db.categories.delete_one({"_id": category_doc["_id"]})
  if delete_result.deleted_count == 0:
    raise HTTPException(status_code=404, detail="Категория не найдена")

  return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
  "/admin/product",
  response_model=Product,
  status_code=status.HTTP_201_CREATED,
)
async def create_product(
  payload: ProductCreate,
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
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
  _admin_id: int = Depends(verify_admin),
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
async def delete_product(
  product_id: str,
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  result = await db.products.delete_one({"_id": as_object_id(product_id)})
  if result.deleted_count == 0:
    raise HTTPException(status_code=404, detail="Товар не найден")
  return {"status": "ok"}

