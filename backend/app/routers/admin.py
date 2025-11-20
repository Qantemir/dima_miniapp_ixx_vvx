from datetime import datetime
from typing import List, Optional
import asyncio
import httpx

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import ServerSelectionTimeoutError, ConnectionFailure

from ..database import get_db
from ..schemas import BroadcastRequest, BroadcastResponse, Order, OrderStatus, UpdateStatusRequest
from ..utils import as_object_id, serialize_doc, restore_variant_quantity
from ..config import get_settings
from ..auth import verify_admin

router = APIRouter(tags=["admin"])


@router.get("/admin/orders", response_model=List[Order])
async def list_orders(
  status_filter: Optional[OrderStatus] = Query(None, alias="status"),
  limit: int = Query(50, ge=1, le=200),
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  try:
    query = {}
    if status_filter:
      query["status"] = status_filter.value
    cursor = db.orders.find(query).sort("created_at", -1).limit(limit)
    return [Order(**serialize_doc(doc) | {"id": str(doc["_id"])}) async for doc in cursor]
  except (ServerSelectionTimeoutError, ConnectionFailure) as e:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="База данных недоступна. Убедитесь, что MongoDB запущена."
    )


@router.get("/admin/order/{order_id}", response_model=Order)
async def get_order(
  order_id: str,
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  doc = await db.orders.find_one({"_id": as_object_id(order_id)})
  if not doc:
    raise HTTPException(status_code=404, detail="Заказ не найден")
  return Order(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.patch("/admin/order/{order_id}/status", response_model=Order)
async def update_order_status(
  order_id: str,
  payload: UpdateStatusRequest,
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  # Получаем старый статус заказа
  old_doc = await db.orders.find_one({"_id": as_object_id(order_id)})
  if not old_doc:
    raise HTTPException(status_code=404, detail="Заказ не найден")
  
  old_status = old_doc.get("status")
  new_status = payload.status.value
  
  # Если заказ отменяется, возвращаем товары на склад
  if new_status == OrderStatus.CANCELED.value and old_status != OrderStatus.CANCELED.value:
    items = old_doc.get("items", [])
    for item in items:
      if item.get("variant_id"):
        await restore_variant_quantity(
          db,
          item.get("product_id"),
          item.get("variant_id"),
          item.get("quantity", 0)
        )
  
  editable_statuses = {
    OrderStatus.NEW.value,
    OrderStatus.PROCESSING.value,
  }
  doc = await db.orders.find_one_and_update(
    {"_id": as_object_id(order_id)},
    {
      "$set": {
        "status": payload.status.value,
        "updated_at": datetime.utcnow(),
        "can_edit_address": payload.status.value in editable_statuses,
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
  _admin_id: int = Depends(verify_admin),
):
  settings = get_settings()
  if not settings.telegram_bot_token:
    raise HTTPException(
      status_code=500,
      detail="TELEGRAM_BOT_TOKEN не настроен. Добавьте токен бота в .env файл."
    )

  batch_size = max(1, settings.broadcast_batch_size)
  concurrency = max(1, settings.broadcast_concurrency)
  customers_cursor = db.customers.find({}, {"telegram_id": 1})

  # Формируем текст сообщения
  message_text = f"*{payload.title}*\n\n{payload.message}"
  if payload.link:
    message_text += f"\n\n🔗 {payload.link}"

  # Отправляем сообщения через Telegram Bot API
  bot_api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
  sent_count = 0
  failed_count = 0
  total_count = 0
  invalid_user_ids: list[int] = []

  async def send_to_customer(
    client: httpx.AsyncClient,
    telegram_id: int,
  ) -> tuple[bool, bool]:
    try:
      response = await client.post(
        bot_api_url,
        json={
          "chat_id": telegram_id,
          "text": message_text,
          "parse_mode": "Markdown",
        },
      )
      payload = response.json()
      if payload.get("ok"):
        return True, False
      error_code = payload.get("error_code")
      description = (payload.get("description") or "").lower()
      is_invalid = error_code in {400, 403, 404} or any(
        phrase in description for phrase in ("chat not found", "user not found", "blocked")
      )
      return False, is_invalid
    except httpx.HTTPStatusError as exc:
      return False, exc.response.status_code in {400, 403, 404}
    except Exception:
      return False, False

  async def flush_invalids():
    nonlocal failed_count, invalid_user_ids
    if not invalid_user_ids:
      return
    chunk = invalid_user_ids
    invalid_user_ids = []
    failed_count += len(chunk)
    await db.customers.delete_many({"telegram_id": {"$in": chunk}})

  async with httpx.AsyncClient(timeout=10.0) as client:
    while True:
      batch = await customers_cursor.to_list(length=batch_size)
      if not batch:
        break
      total_count += len(batch)
      telegram_ids = [customer["telegram_id"] for customer in batch]

      # Ограничиваем конкуренцию, разбивая на подгруппы
      for i in range(0, len(telegram_ids), concurrency):
        chunk = telegram_ids[i:i + concurrency]
        results = await asyncio.gather(
          *[send_to_customer(client, telegram_id) for telegram_id in chunk],
          return_exceptions=False,
        )
        for telegram_id, (sent, invalid) in zip(chunk, results):
          if sent:
            sent_count += 1
          if invalid:
            invalid_user_ids.append(telegram_id)

      if len(invalid_user_ids) >= 500:
        await flush_invalids()

  await flush_invalids()

  # Сохраняем запись о рассылке с статистикой
  entry = {
    "title": payload.title,
    "message": payload.message,
    "segment": payload.segment,
    "link": payload.link,
    "total_count": total_count,
    "sent_count": sent_count,
    "failed_count": failed_count,
    "created_at": datetime.utcnow(),
  }
  await db.broadcasts.insert_one(entry)

  return BroadcastResponse(
    success=True,
    sent_count=sent_count,
    total_count=total_count,
    failed_count=failed_count
  )

