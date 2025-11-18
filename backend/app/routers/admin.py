from datetime import datetime
from typing import List, Optional
import httpx

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import ServerSelectionTimeoutError, ConnectionFailure

from ..database import get_db
from ..schemas import BroadcastRequest, BroadcastResponse, Order, OrderStatus, UpdateStatusRequest
from ..utils import as_object_id, serialize_doc
from ..config import get_settings

router = APIRouter(tags=["admin"])


@router.get("/admin/orders", response_model=List[Order])
async def list_orders(
  status_filter: Optional[OrderStatus] = Query(None, alias="status"),
  limit: int = Query(50, ge=1, le=200),
  db: AsyncIOMotorDatabase = Depends(get_db),
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
  settings = get_settings()
  if not settings.telegram_bot_token:
    raise HTTPException(
      status_code=500,
      detail="TELEGRAM_BOT_TOKEN не настроен. Добавьте токен бота в .env файл."
    )

  # Получаем всех клиентов из базы данных (до отправки, чтобы знать общее количество)
  customers_cursor = db.customers.find({})
  customers = await customers_cursor.to_list(length=None)
  total_count = len(customers)

  if not customers:
    return BroadcastResponse(success=True, sent_count=0, total_count=0, failed_count=0)

  # Формируем текст сообщения
  message_text = f"*{payload.title}*\n\n{payload.message}"
  if payload.link:
    message_text += f"\n\n🔗 {payload.link}"

  # Отправляем сообщения через Telegram Bot API
  bot_api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
  sent_count = 0
  invalid_user_ids = []

  async with httpx.AsyncClient(timeout=10.0) as client:
    for customer in customers:
      telegram_id = customer["telegram_id"]
      try:
        response = await client.post(
          bot_api_url,
          json={
            "chat_id": telegram_id,
            "text": message_text,
            "parse_mode": "Markdown",
          }
        )
        result = response.json()
        if result.get("ok"):
          sent_count += 1
        else:
          # Если Telegram вернул ошибку, проверяем код
          error_code = result.get("error_code")
          error_description = result.get("description", "").lower()
          # Коды ошибок, когда пользователь недоступен
          if error_code in [403, 400] or "chat not found" in error_description or "user not found" in error_description or "blocked" in error_description:
            invalid_user_ids.append(telegram_id)
      except httpx.HTTPStatusError as e:
        # Обрабатываем HTTP ошибки
        if e.response.status_code in [403, 400, 404]:
          invalid_user_ids.append(telegram_id)
        # Для других ошибок просто пропускаем
        continue
      except Exception:
        # Для любых других ошибок (таймаут, сеть и т.д.) пропускаем
        continue

  # Удаляем невалидных пользователей из базы данных
  failed_count = len(invalid_user_ids)
  if invalid_user_ids:
    await db.customers.delete_many({"telegram_id": {"$in": invalid_user_ids}})

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

