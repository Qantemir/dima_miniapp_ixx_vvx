from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import get_db
from ..schemas import (
  Cart,
  CreateOrderRequest,
  Order,
  OrderStatus,
  UpdateAddressRequest,
)
from ..utils import as_object_id, serialize_doc

router = APIRouter(tags=["orders"])


async def get_cart(db: AsyncIOMotorDatabase, user_id: int) -> Cart | None:
  cart = await db.carts.find_one({"user_id": user_id})
  if not cart or not cart.get("items"):
    return None
  return Cart(**serialize_doc(cart) | {"id": str(cart["_id"])})


@router.post("/order", response_model=Order, status_code=status.HTTP_201_CREATED)
async def create_order(
  payload: CreateOrderRequest, db: AsyncIOMotorDatabase = Depends(get_db)
):
  cart = await get_cart(db, payload.user_id)
  if not cart:
    raise HTTPException(status_code=400, detail="Корзина пуста")

  order_doc = {
    "user_id": payload.user_id,
    "customer_name": payload.name,
    "customer_phone": payload.phone,
    "delivery_address": payload.address,
    "comment": payload.comment,
    "status": OrderStatus.NEW.value,
    "items": [item.dict() for item in cart.items],
    "total_amount": cart.total_amount,
    "can_edit_address": True,
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow(),
  }
  result = await db.orders.insert_one(order_doc)
  await db.carts.delete_one({"_id": as_object_id(cart.id)})
  doc = await db.orders.find_one({"_id": result.inserted_id})
  return Order(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.get("/order/last", response_model=Order | None)
async def get_last_order(
  user_id: int = Query(...), db: AsyncIOMotorDatabase = Depends(get_db)
):
  doc = await db.orders.find_one(
    {"user_id": user_id},
    sort=[("created_at", -1)],
  )
  if not doc:
    return None
  return Order(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.patch("/order/{order_id}/address", response_model=Order)
async def update_order_address(
  order_id: str,
  payload: UpdateAddressRequest,
  db: AsyncIOMotorDatabase = Depends(get_db),
):
  doc = await db.orders.find_one({"_id": as_object_id(order_id)})
  if not doc or doc["user_id"] != payload.user_id:
    raise HTTPException(status_code=404, detail="Заказ не найден")
  if doc["status"] in [
    OrderStatus.SHIPPED.value,
    OrderStatus.DONE.value,
    OrderStatus.CANCELED.value,
  ]:
    raise HTTPException(status_code=400, detail="Адрес нельзя изменить для этого статуса")

  updated = await db.orders.find_one_and_update(
    {"_id": as_object_id(order_id)},
    {
      "$set": {
        "delivery_address": payload.address,
        "updated_at": datetime.utcnow(),
      }
    },
    return_document=True,
  )
  return Order(**serialize_doc(updated) | {"id": str(updated["_id"])})

