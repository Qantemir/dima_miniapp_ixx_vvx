import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import ServerSelectionTimeoutError, ConnectionFailure

from ..auth import verify_admin
from ..database import get_db
from ..schemas import StoreSleepRequest, StoreStatus

router = APIRouter(tags=["store"])


class StoreStatusBroadcaster:
  def __init__(self):
    self._listeners: set[asyncio.Queue] = set()

  def register(self) -> asyncio.Queue:
    queue: asyncio.Queue = asyncio.Queue()
    self._listeners.add(queue)
    return queue

  def unregister(self, queue: asyncio.Queue):
    self._listeners.discard(queue)

  async def broadcast(self, payload: dict):
    stale_listeners: list[asyncio.Queue] = []
    for queue in list(self._listeners):
      try:
        queue.put_nowait(payload)
      except asyncio.QueueFull:
        stale_listeners.append(queue)
    for queue in stale_listeners:
      self.unregister(queue)


store_status_broadcaster = StoreStatusBroadcaster()


async def get_or_create_store_status(db: AsyncIOMotorDatabase):
  try:
    doc = await db.store_status.find_one({})
    if not doc:
      status_doc = {
        "is_sleep_mode": False,
        "sleep_message": None,
        "sleep_until": None,
        "updated_at": datetime.utcnow(),
      }
      result = await db.store_status.insert_one(status_doc)
      status_doc["_id"] = result.inserted_id
      return status_doc
    return await _ensure_awake_if_needed(db, doc)
  except (ServerSelectionTimeoutError, ConnectionFailure) as e:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="База данных недоступна. Убедитесь, что MongoDB запущена."
    )


@router.get("/store/status", response_model=StoreStatus)
async def get_store_status(db: AsyncIOMotorDatabase = Depends(get_db)):
  try:
    doc = await get_or_create_store_status(db)
    return StoreStatus(**doc)
  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Ошибка при получении статуса магазина: {str(e)}"
    )


@router.patch("/admin/store/sleep", response_model=StoreStatus)
async def toggle_store_sleep(
  payload: StoreSleepRequest,
  db: AsyncIOMotorDatabase = Depends(get_db),
  _admin_id: int = Depends(verify_admin),
):
  doc = await get_or_create_store_status(db)
  await db.store_status.update_one(
    {"_id": doc["_id"]},
    {
      "$set": {
        "is_sleep_mode": payload.sleep,
        "sleep_message": payload.message,
        "sleep_until": payload.sleep_until if payload.sleep else None,
        "updated_at": datetime.utcnow(),
      }
    },
  )
  updated = await db.store_status.find_one({"_id": doc["_id"]})
  updated = await _ensure_awake_if_needed(db, updated)
  status_model = StoreStatus(**updated)
  await store_status_broadcaster.broadcast(_serialize_store_status(status_model))
  return status_model


def _serialize_store_status(model: StoreStatus) -> dict:
  return {
    "is_sleep_mode": model.is_sleep_mode,
    "sleep_message": model.sleep_message,
    "sleep_until": model.sleep_until.isoformat() if model.sleep_until else None,
    "updated_at": model.updated_at.isoformat(),
  }


@router.get("/store/status/stream")
async def stream_store_status(
  request: Request,
  db: AsyncIOMotorDatabase = Depends(get_db),
):
  queue = store_status_broadcaster.register()
  current_doc = await get_or_create_store_status(db)
  await queue.put(_serialize_store_status(StoreStatus(**current_doc)))

  async def event_generator():
    try:
      while True:
        data = await queue.get()
        yield f"event: status\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
    except asyncio.CancelledError:
      pass
    finally:
      store_status_broadcaster.unregister(queue)

  return StreamingResponse(event_generator(), media_type="text/event-stream")


async def _ensure_awake_if_needed(db: AsyncIOMotorDatabase, doc: dict):
  """
  Проверяет, нужно ли автоматически вывести магазин из режима сна
  (если указано время sleep_until и оно уже прошло).
  """
  if not doc:
    return doc

  try:
    sleep_until = doc.get("sleep_until")
    is_sleep_mode = doc.get("is_sleep_mode")

    if is_sleep_mode and sleep_until:
      # Преобразуем sleep_until к datetime, если это строка
      if isinstance(sleep_until, str):
        sleep_until_dt = datetime.fromisoformat(sleep_until)
      else:
        sleep_until_dt = sleep_until

      if sleep_until_dt <= datetime.utcnow():
        await db.store_status.update_one(
          {"_id": doc["_id"]},
          {
            "$set": {
              "is_sleep_mode": False,
              "sleep_message": None,
              "sleep_until": None,
              "updated_at": datetime.utcnow(),
            }
          }
        )
        doc["is_sleep_mode"] = False
        doc["sleep_message"] = None
        doc["sleep_until"] = None
        doc["updated_at"] = datetime.utcnow()
        # Рассылаем обновление клиентам
        await store_status_broadcaster.broadcast(
          _serialize_store_status(StoreStatus(**doc))
        )
  except Exception:
    pass

  return doc

