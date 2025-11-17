from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import get_db
from ..schemas import StoreSleepRequest, StoreStatus

router = APIRouter(tags=["store"])


async def get_or_create_store_status(db: AsyncIOMotorDatabase):
  doc = await db.store_status.find_one({})
  if not doc:
    status_doc = {
      "is_sleep_mode": False,
      "sleep_message": None,
      "updated_at": datetime.utcnow(),
    }
    result = await db.store_status.insert_one(status_doc)
    status_doc["_id"] = result.inserted_id
    return status_doc
  return doc


@router.get("/store/status", response_model=StoreStatus)
async def get_store_status(db: AsyncIOMotorDatabase = Depends(get_db)):
  doc = await get_or_create_store_status(db)
  return StoreStatus(**doc)


@router.patch("/admin/store/sleep", response_model=StoreStatus)
async def toggle_store_sleep(
  payload: StoreSleepRequest, db: AsyncIOMotorDatabase = Depends(get_db)
):
  doc = await get_or_create_store_status(db)
  await db.store_status.update_one(
    {"_id": doc["_id"]},
    {
      "$set": {
        "is_sleep_mode": payload.sleep,
        "sleep_message": payload.message,
        "updated_at": datetime.utcnow(),
      }
    },
  )
  updated = await db.store_status.find_one({"_id": doc["_id"]})
  return StoreStatus(**updated)

