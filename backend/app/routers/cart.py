from uuid import uuid4
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import get_db
from ..schemas import AddToCartRequest, Cart, RemoveFromCartRequest, UpdateCartItemRequest
from ..utils import as_object_id, serialize_doc, restore_variant_quantity

# Время жизни корзины в минутах
CART_EXPIRY_MINUTES = 10

router = APIRouter(tags=["cart"])


async def cleanup_expired_cart(db: AsyncIOMotorDatabase, cart: dict):
  """Очищает просроченную корзину и возвращает товары на склад"""
  if not cart or not cart.get("items"):
    return False
  
  updated_at = cart.get("updated_at")
  if not updated_at:
    updated_at = cart.get("created_at", datetime.utcnow())
  
  # Проверяем, прошло ли 10 минут с последнего обновления
  if isinstance(updated_at, datetime):
    expiry_time = updated_at + timedelta(minutes=CART_EXPIRY_MINUTES)
  else:
    # Если это строка или другой формат, конвертируем
    if isinstance(updated_at, str):
      try:
        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
      except:
        updated_at = datetime.utcnow()
    expiry_time = updated_at + timedelta(minutes=CART_EXPIRY_MINUTES)
  
  if datetime.utcnow() > expiry_time:
    # Возвращаем все товары на склад
    for item in cart.get("items", []):
      if item.get("variant_id"):
        await restore_variant_quantity(
          db,
          item.get("product_id"),
          item.get("variant_id"),
          item.get("quantity", 0)
        )
    
    # Удаляем корзину
    await db.carts.delete_one({"_id": cart["_id"]})
    return True
  return False


async def get_cart_document(db: AsyncIOMotorDatabase, user_id: int):
  cart = await db.carts.find_one({"user_id": user_id})
  if not cart:
    cart = {
      "user_id": user_id,
      "items": [],
      "total_amount": 0,
      "created_at": datetime.utcnow(),
      "updated_at": datetime.utcnow(),
    }
    result = await db.carts.insert_one(cart)
    cart["_id"] = result.inserted_id
  else:
    # Проверяем, не истекла ли корзина
    was_expired = await cleanup_expired_cart(db, cart)
    if was_expired:
      # Создаем новую корзину
      cart = {
        "user_id": user_id,
        "items": [],
        "total_amount": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
      }
      result = await db.carts.insert_one(cart)
      cart["_id"] = result.inserted_id
  return cart


async def deduct_variant_quantity(
  db: AsyncIOMotorDatabase,
  product_id: str,
  variant_id: str,
  quantity: int
):
  """Списывает количество товара со склада"""
  try:
    product_oid = as_object_id(product_id)
    product = await db.products.find_one({"_id": product_oid})
    if product:
      variants = product.get("variants", [])
      variant = next((v for v in variants if v.get("id") == variant_id), None)
      if variant:
        variant_quantity = variant.get("quantity", 0)
        if variant_quantity < quantity:
          raise HTTPException(
            status_code=400,
            detail=f"Недостаточно товара. В наличии: {variant_quantity}"
          )
        variant["quantity"] = variant_quantity - quantity
        await db.products.update_one(
          {"_id": product_oid},
          {"$set": {"variants": variants}}
        )
  except ValueError:
    pass  # Игнорируем ошибки парсинга ObjectId


def recalculate_total(cart):
  cart["total_amount"] = round(sum(item["price"] * item["quantity"] for item in cart["items"]), 2)
  return cart


@router.get("/cart", response_model=Cart)
async def get_cart(user_id: int = Query(...), db: AsyncIOMotorDatabase = Depends(get_db)):
  # Проверяем и очищаем просроченные корзины перед получением
  cart_doc = await db.carts.find_one({"user_id": user_id})
  if cart_doc:
    await cleanup_expired_cart(db, cart_doc)
  
  cart = await get_cart_document(db, user_id)
  return Cart(**serialize_doc(cart) | {"id": str(cart["_id"])})


@router.post("/cart", response_model=Cart)
async def add_to_cart(
  payload: AddToCartRequest, db: AsyncIOMotorDatabase = Depends(get_db)
):
  try:
    product_oid = as_object_id(payload.product_id)
  except ValueError:
    raise HTTPException(status_code=400, detail="Некорректный идентификатор товара")

  product = await db.products.find_one({"_id": product_oid})
  if not product:
    raise HTTPException(status_code=404, detail="Товар не найден")

  # Вариации обязательны для всех товаров
  variants = product.get("variants", [])
  if not variants or len(variants) == 0:
    raise HTTPException(
      status_code=400,
      detail="Товар не может быть продан без вариаций (вкусов). Обратитесь к администратору."
    )
  
  # Проверяем, что вариация указана
  if not payload.variant_id:
    raise HTTPException(
      status_code=400,
      detail="Необходимо выбрать вариацию (вкус)"
    )
  
  # Проверяем вариацию
  variant = next((v for v in variants if v.get("id") == payload.variant_id), None)
  if not variant:
    raise HTTPException(status_code=404, detail="Вариация не найдена")
  
  variant_name = variant.get("name")
  variant_price = product.get("price", 0)  # Используем цену товара
  variant_quantity = variant.get("quantity", 0)
  
  # Проверяем количество на складе
  if variant_quantity < payload.quantity:
    raise HTTPException(
      status_code=400,
      detail=f"Недостаточно товара. В наличии: {variant_quantity}"
    )

  cart = await get_cart_document(db, payload.user_id)
  
  # Ищем существующий товар с такой же вариацией
  existing = next(
    (item for item in cart["items"] 
     if item["product_id"] == payload.product_id 
     and item.get("variant_id") == payload.variant_id),
    None
  )
  
  if existing:
    # Увеличиваем количество в корзине
    existing["quantity"] = existing["quantity"] + payload.quantity
  else:
    cart["items"].append(
      {
        "id": uuid4().hex,
        "product_id": payload.product_id,
        "variant_id": payload.variant_id,
        "product_name": product["name"],
        "variant_name": variant_name,
        "quantity": payload.quantity,
        "price": variant_price,
        "image": variant.get("image") if variant else product.get("image"),
      }
    )

  # Списываем товар со склада сразу при добавлении в корзину
  await deduct_variant_quantity(
    db,
    payload.product_id,
    payload.variant_id,
    payload.quantity
  )

  cart["updated_at"] = datetime.utcnow()
  cart = recalculate_total(cart)
  await db.carts.update_one({"_id": cart["_id"]}, {"$set": cart})
  
  # Сохраняем или обновляем клиента в базе данных
  now = datetime.utcnow()
  existing_customer = await db.customers.find_one({"telegram_id": payload.user_id})
  if existing_customer:
    await db.customers.update_one(
      {"telegram_id": payload.user_id},
      {"$set": {"last_cart_activity": now}}
    )
  else:
    await db.customers.insert_one({
      "telegram_id": payload.user_id,
      "added_at": now,
      "last_cart_activity": now,
    })
  
  return Cart(**serialize_doc(cart) | {"id": str(cart["_id"])})


@router.patch("/cart/item", response_model=Cart)
async def update_cart_item(
  payload: UpdateCartItemRequest, db: AsyncIOMotorDatabase = Depends(get_db)
):
  cart = await get_cart_document(db, payload.user_id)
  item = next((item for item in cart["items"] if item["id"] == payload.item_id), None)
  if not item:
    raise HTTPException(status_code=404, detail="Товар не найден в корзине")
  
  old_quantity = item.get("quantity", 0)
  quantity_diff = payload.quantity - old_quantity
  
  # Если количество изменилось, корректируем склад
  if item.get("variant_id") and quantity_diff != 0:
    try:
      product_oid = as_object_id(item["product_id"])
      product = await db.products.find_one({"_id": product_oid})
      if product:
        variants = product.get("variants", [])
        variant = next((v for v in variants if v.get("id") == item.get("variant_id")), None)
        if variant:
          variant_quantity = variant.get("quantity", 0)
          
          if quantity_diff > 0:
            # Увеличиваем количество - проверяем наличие и списываем
            if variant_quantity < quantity_diff:
              raise HTTPException(
                status_code=400,
                detail=f"Недостаточно товара. В наличии: {variant_quantity}"
              )
            await deduct_variant_quantity(
              db,
              item["product_id"],
              item.get("variant_id"),
              quantity_diff
            )
          else:
            # Уменьшаем количество - возвращаем на склад
            await restore_variant_quantity(
              db,
              item["product_id"],
              item.get("variant_id"),
              abs(quantity_diff)
            )
    except ValueError:
      pass  # Игнорируем ошибки парсинга ObjectId
  
  item["quantity"] = payload.quantity
  cart["updated_at"] = datetime.utcnow()
  cart = recalculate_total(cart)
  await db.carts.update_one({"_id": cart["_id"]}, {"$set": cart})
  return Cart(**serialize_doc(cart) | {"id": str(cart["_id"])})


@router.delete("/cart/item", response_model=Cart)
async def remove_from_cart(
  payload: RemoveFromCartRequest, db: AsyncIOMotorDatabase = Depends(get_db)
):
  cart = await get_cart_document(db, payload.user_id)
  item_to_remove = next((item for item in cart["items"] if item["id"] == payload.item_id), None)
  if not item_to_remove:
    raise HTTPException(status_code=404, detail="Товар не найден в корзине")
  
  # Возвращаем товар на склад при удалении из корзины
  if item_to_remove.get("variant_id"):
    await restore_variant_quantity(
      db,
      item_to_remove["product_id"],
      item_to_remove.get("variant_id"),
      item_to_remove.get("quantity", 0)
    )
  
  cart["items"] = [item for item in cart["items"] if item["id"] != payload.item_id]
  cart["updated_at"] = datetime.utcnow()
  cart = recalculate_total(cart)
  await db.carts.update_one({"_id": cart["_id"]}, {"$set": cart})
  return Cart(**serialize_doc(cart) | {"id": str(cart["_id"])})

