from datetime import datetime, timedelta
from typing import List, Sequence, Tuple

import asyncio
import json
import logging
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
  CategoryDetail,
  CategoryUpdate,
  Product,
  ProductCreate,
  ProductUpdate,
)
from ..utils import as_object_id, serialize_doc

router = APIRouter(tags=["catalog"])
logger = logging.getLogger(__name__)

_catalog_cache: CatalogResponse | None = None
_catalog_cache_etag: str | None = None
_catalog_cache_expiration: datetime | None = None
_catalog_cache_version: str | None = None
_catalog_cache_lock = asyncio.Lock()
_CATALOG_CACHE_STATE_ID = "catalog_cache_state"


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
  
  # Валидируем категории с обработкой ошибок
  categories = []
  for doc in categories_docs:
    try:
      serialized = serialize_doc(doc)
      category_data = serialized | {"id": str(doc["_id"])}
      category = Category(**category_data)
      categories.append(category)
    except Exception as e:
      import logging
      logger = logging.getLogger(__name__)
      logger.error(f"Ошибка валидации категории {doc.get('_id')}: {e}, данные: {serialized}")
      # Пропускаем проблемную категорию
      continue
  
  # Валидируем товары с обработкой ошибок
  products = []
  for doc in products_docs:
    try:
      serialized = serialize_doc(doc)
      product_data = serialized | {"id": str(doc["_id"])}
      
      # Убеждаемся, что обязательные поля присутствуют и имеют правильный тип
      if "name" not in product_data or not product_data["name"]:
        continue  # Пропускаем товары без названия
      if "price" not in product_data or product_data["price"] is None:
        product_data["price"] = 0.0  # Устанавливаем цену по умолчанию
      if not isinstance(product_data["price"], (int, float)):
        try:
          product_data["price"] = float(product_data["price"])
        except (ValueError, TypeError):
          product_data["price"] = 0.0
      if "category_id" not in product_data or not product_data["category_id"]:
        continue  # Пропускаем товары без категории
      if "available" not in product_data:
        product_data["available"] = True
      if not isinstance(product_data["available"], bool):
        product_data["available"] = bool(product_data["available"])
      
      product = Product(**product_data)
      products.append(product)
    except Exception as e:
      import logging
      logger = logging.getLogger(__name__)
      logger.error(f"Ошибка валидации товара {doc.get('_id')}: {e}, данные: {serialized}")
      # Пропускаем проблемный товар
      continue
  
  return CatalogResponse(categories=categories, products=products)


def _catalog_to_dict(payload: CatalogResponse) -> dict:
  return payload.dict(by_alias=True)


def _compute_catalog_etag(payload: CatalogResponse) -> str:
  payload_dict = _catalog_to_dict(payload)
  serialized = json.dumps(payload_dict, sort_keys=True, ensure_ascii=False)
  return sha256(serialized.encode("utf-8")).hexdigest()


def _generate_cache_version() -> str:
  return str(ObjectId())


async def _get_catalog_cache_version(db: AsyncIOMotorDatabase) -> str:
  doc = await db.cache_state.find_one({"_id": _CATALOG_CACHE_STATE_ID})
  if doc and doc.get("version"):
    return doc["version"]

  version = _generate_cache_version()
  await db.cache_state.update_one(
    {"_id": _CATALOG_CACHE_STATE_ID},
    {
      "$set": {
        "version": version,
        "updated_at": datetime.utcnow(),
      }
    },
    upsert=True,
  )
  return version


async def _bump_catalog_cache_version(db: AsyncIOMotorDatabase) -> str:
  version = _generate_cache_version()
  await db.cache_state.update_one(
    {"_id": _CATALOG_CACHE_STATE_ID},
    {
      "$set": {
        "version": version,
        "updated_at": datetime.utcnow(),
      }
    },
    upsert=True,
  )
  return version


async def fetch_catalog(
  db: AsyncIOMotorDatabase,
  *,
  force_refresh: bool = False,
) -> Tuple[CatalogResponse, str]:
  global _catalog_cache, _catalog_cache_etag, _catalog_cache_expiration, _catalog_cache_version
  ttl = settings.catalog_cache_ttl_seconds
  now = datetime.utcnow()
  current_version = await _get_catalog_cache_version(db)

  if (
    not force_refresh
    and ttl > 0
    and _catalog_cache
    and _catalog_cache_etag
    and _catalog_cache_expiration
    and _catalog_cache_expiration > now
    and _catalog_cache_version == current_version
  ):
    return _catalog_cache, _catalog_cache_etag

  async with _catalog_cache_lock:
    current_version = await _get_catalog_cache_version(db)
    now = datetime.utcnow()
    if (
      not force_refresh
      and ttl > 0
      and _catalog_cache
      and _catalog_cache_etag
      and _catalog_cache_expiration
      and _catalog_cache_expiration > now
      and _catalog_cache_version == current_version
    ):
      return _catalog_cache, _catalog_cache_etag

    data = await _load_catalog_from_db(db)
    etag = _compute_catalog_etag(data)

    if ttl > 0:
      _catalog_cache = data
      _catalog_cache_etag = etag
      _catalog_cache_expiration = now + timedelta(seconds=ttl)
      _catalog_cache_version = current_version
    else:
      _catalog_cache = None
      _catalog_cache_etag = None
      _catalog_cache_expiration = None
      _catalog_cache_version = None

    return data, etag


async def invalidate_catalog_cache(db: AsyncIOMotorDatabase | None = None):
  global _catalog_cache, _catalog_cache_expiration, _catalog_cache_etag, _catalog_cache_version
  _catalog_cache = None
  _catalog_cache_expiration = None
  _catalog_cache_etag = None
  _catalog_cache_version = None

  if db is not None:
    _catalog_cache_version = await _bump_catalog_cache_version(db)


async def _refresh_catalog_cache(db: AsyncIOMotorDatabase):
  try:
    await fetch_catalog(db, force_refresh=True)
  except Exception as exc:
    logger.warning("Failed to warm catalog cache after mutation: %s", exc)


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
  if if_none_match and if_none_match == etag:
    return _build_not_modified_response(etag)
  return _build_catalog_response(catalog, etag)


@router.get("/admin/catalog", response_model=CatalogResponse)
async def get_admin_catalog(
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
  if_none_match: str | None = Header(None, alias="If-None-Match"),
):
  try:
    catalog, etag = await fetch_catalog(db, force_refresh=True)
    if if_none_match and if_none_match == etag:
      return _build_not_modified_response(etag)
    return _build_catalog_response(catalog, etag)
  except Exception as e:
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Ошибка при загрузке каталога для админки: {e}", exc_info=True)
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Ошибка при загрузке каталога: {str(e)}"
    )

@router.get("/admin/category/{category_id}", response_model=CategoryDetail)
async def get_admin_category_detail(
  category_id: str,
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  category_doc = await db.categories.find_one({"_id": {"$in": _build_id_candidates(category_id)}})
  if not category_doc:
    raise HTTPException(status_code=404, detail="Категория не найдена")

  candidate_values = set(_build_id_candidates(category_id))
  if category_doc.get("_id"):
    candidate_values.add(str(category_doc["_id"]))

  products_cursor = db.products.find({"category_id": {"$in": list(candidate_values)}})
  products_docs = await products_cursor.to_list(length=None)

  category_model = Category(**serialize_doc(category_doc) | {"id": str(category_doc["_id"])})
  products_models = []
  for doc in products_docs:
    try:
      products_models.append(Product(**serialize_doc(doc) | {"id": str(doc["_id"]) }))
    except Exception:
      continue

  return CategoryDetail(category=category_model, products=products_models)


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
  await invalidate_catalog_cache(db)
  await _refresh_catalog_cache(db)
  logger.info("Admin %s created category %s (%s)", _admin_id, doc.get("name"), doc.get("_id"))
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
  await invalidate_catalog_cache(db)
  await _refresh_catalog_cache(db)
  logger.info("Admin %s updated category %s (%s)", _admin_id, result.get("name"), result.get("_id"))
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

  await invalidate_catalog_cache(db)
  await _refresh_catalog_cache(db)
  logger.info(
    "Admin %s deleted category %s (%s) cleanup_values=%s",
    _admin_id,
    category_doc.get("name"),
    category_doc.get("_id"),
    list(cleanup_values),
  )
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
  await invalidate_catalog_cache(db)
  await _refresh_catalog_cache(db)
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
  await invalidate_catalog_cache(db)
  await _refresh_catalog_cache(db)
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
  await invalidate_catalog_cache(db)
  await _refresh_catalog_cache(db)
  return {"status": "ok"}

