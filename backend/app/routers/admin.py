from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import get_db
from ..schemas import BroadcastRequest, BroadcastResponse, Order, OrderStatus, UpdateStatusRequest
from ..utils import as_object_id, serialize_doc

router = APIRouter(tags=["admin"])


@router.get("/admin/orders", response_model=List[Order])
async def list_orders(
  status_filter: Optional[OrderStatus] = Query(None, alias="status"),
  limit: int = Query(50, ge=1, le=200),
  db: AsyncIOMotorDatabase = Depends(get_db),
):
  query = {}
  if status_filter:
    query["status"] = status_filter.value
  cursor = db.orders.find(query).sort("created_at", -1).limit(limit)
  return [Order(**serialize_doc(doc) | {"id": str(doc["_id"])}) async for doc in cursor]


@router.get("/admin/order/{order_id}", response_model=Order)
async def get_order(order_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
  doc = await db.orders.find_one({"_id": as_object_id(order_id)})
  if not doc:
    raise HTTPException(status_code=404, detail="Заказ не найден")
  return Order(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.patch("/admin/order/{order_id}/status", response_model=Order)
async def update_order_status(
  order_id: str,
  payload: UpdateStatusRequest,
  db: AsyncIOMotorDatabase = Depends(get_db),
):
  disallowed_edit_statuses = {
    OrderStatus.SHIPPED.value,
    OrderStatus.DONE.value,
    OrderStatus.CANCELED.value,
  }
  doc = await db.orders.find_one_and_update(
    {"_id": as_object_id(order_id)},
    {
      "$set": {
        "status": payload.status.value,
        "updated_at": datetime.utcnow(),
        "can_edit_address": payload.status.value not in disallowed_edit_statuses,
      }
    },
    return_document=True,
  )
  if not doc:
    raise HTTPException(status_code=404, detail="Заказ не найден")
  return Order(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.post("/admin/broadcast", response_model=BroadcastResponse)
async def send_broadcast(
  payload: BroadcastRequest,
  db: AsyncIOMotorDatabase = Depends(get_db),
):
  entry = {
    "title": payload.title,
    "message": payload.message,
    "segment": payload.segment,
    "link": payload.link,
    "created_at": datetime.utcnow(),
  }
  await db.broadcasts.insert_one(entry)
  # Здесь можно вызвать реальную отправку через Telegram Bot API
  return BroadcastResponse(success=True, sent_count=0)

