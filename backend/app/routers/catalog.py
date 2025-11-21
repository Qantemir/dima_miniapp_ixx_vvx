from datetime import datetime, timedelta
from typing import List, Sequence, Tuple

import asyncio
import json
from hashlib import sha256
from bson import ObjectId
from fastapi import (
  APIRouter,
  Depends,
  Header,
  HTTPException,
  Query,
  Response,
  status,
)
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from ..auth import verify_admin
from ..config import settings
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

_catalog_cache: CatalogResponse | None = None
_catalog_cache_etag: str | None = None
_catalog_cache_expiration: datetime | None = None
_catalog_cache_lock = asyncio.Lock()


async def _load_catalog_from_db(db: AsyncIOMotorDatabase) -> CatalogResponse:
  # Параллельная загрузка категорий и товаров для ускорения
  categories_task = db.categories.find({}, {"name": 1}).to_list(length=None)
  products_task = db.products.find(
    {},
    {
      "name": 1,
      "description": 1,
      "price": 1,
      "image": 1,
      "images": 1,
      "category_id": 1,
      "available": 1,
      "variants": 1,
    },
  ).to_list(length=None)
  
  # Выполняем запросы параллельно
  categories_docs, products_docs = await asyncio.gather(categories_task, products_task)
  
  categories = [Category(**serialize_doc(doc) | {"id": str(doc["_id"])}) for doc in categories_docs]
  products = [Product(**serialize_doc(doc) | {"id": str(doc["_id"])}) for doc in products_docs]
  return CatalogResponse(categories=categories, products=products)


def _catalog_to_dict(payload: CatalogResponse) -> dict:
  return payload.dict(by_alias=True)


def _compute_catalog_etag(payload: CatalogResponse) -> str:
  payload_dict = _catalog_to_dict(payload)
  serialized = json.dumps(payload_dict, sort_keys=True, ensure_ascii=False)
  return sha256(serialized.encode("utf-8")).hexdigest()


async def fetch_catalog(db: AsyncIOMotorDatabase) -> Tuple[CatalogResponse, str]:
  ttl = settings.catalog_cache_ttl_seconds
  if ttl <= 0:
    catalog = await _load_catalog_from_db(db)
    return catalog, _compute_catalog_etag(catalog)

  global _catalog_cache, _catalog_cache_expiration, _catalog_cache_etag
  now = datetime.utcnow()
  if (
    _catalog_cache
    and _catalog_cache_etag
    and _catalog_cache_expiration
    and _catalog_cache_expiration > now
  ):
    return _catalog_cache, _catalog_cache_etag

  async with _catalog_cache_lock:
    now = datetime.utcnow()
    if (
      _catalog_cache
      and _catalog_cache_etag
      and _catalog_cache_expiration
      and _catalog_cache_expiration > now
    ):
      return _catalog_cache, _catalog_cache_etag

    data = await _load_catalog_from_db(db)
    etag = _compute_catalog_etag(data)
    _catalog_cache = data
    _catalog_cache_etag = etag
    _catalog_cache_expiration = now + timedelta(seconds=ttl)
    return data, etag


def invalidate_catalog_cache():
  global _catalog_cache, _catalog_cache_expiration, _catalog_cache_etag
  _catalog_cache = None
  _catalog_cache_expiration = None
  _catalog_cache_etag = None


def _build_catalog_response(catalog: CatalogResponse, etag: str) -> JSONResponse:
  response = JSONResponse(content=_catalog_to_dict(catalog))
  response.headers["ETag"] = etag
  response.headers["Cache-Control"] = _build_cache_control_value()
  return response


def _build_not_modified_response(etag: str) -> Response:
  headers = {
    "ETag": etag,
    "Cache-Control": _build_cache_control_value(),
  }
  return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=headers)


def _build_cache_control_value() -> str:
  ttl = max(0, settings.catalog_cache_ttl_seconds)
  cache_scope = "public"
  return f"{cache_scope}, max-age={ttl}, must-revalidate"


@router.get("/catalog", response_model=CatalogResponse)
async def get_catalog(
  db: AsyncIOMotorDatabase = Depends(get_db),
  if_none_match: str | None = Header(None, alias="If-None-Match"),
):
  catalog, etag = await fetch_catalog(db)
  # Временно отключаем 304 Not Modified для упрощения
  # if if_none_match and if_none_match == etag:
  #   return _build_not_modified_response(etag)
  return _build_catalog_response(catalog, etag)


@router.get("/admin/catalog", response_model=CatalogResponse)
async def get_admin_catalog(
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
  if_none_match: str | None = Header(None, alias="If-None-Match"),
):
  catalog, etag = await fetch_catalog(db)
  # Временно отключаем 304 Not Modified для упрощения
  # if if_none_match and if_none_match == etag:
  #   return _build_not_modified_response(etag)
  return _build_catalog_response(catalog, etag)


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
  invalidate_catalog_cache()
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
  invalidate_catalog_cache()
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

  invalidate_catalog_cache()
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
  invalidate_catalog_cache()
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
  invalidate_catalog_cache()
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
  invalidate_catalog_cache()
  return {"status": "ok"}

