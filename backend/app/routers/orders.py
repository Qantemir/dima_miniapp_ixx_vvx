from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import (
  APIRouter,
  Depends,
  File,
  Form,
  HTTPException,
  UploadFile,
  status,
)
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..config import settings
from ..database import get_db
from ..schemas import (
  Cart,
  Order,
  OrderStatus,
  UpdateAddressRequest,
)
from ..utils import as_object_id, serialize_doc
from ..security import TelegramUser, get_current_user
from ..notifications import notify_admins_new_order

router = APIRouter(tags=["orders"])


async def get_cart(db: AsyncIOMotorDatabase, user_id: int) -> Cart | None:
  cart = await db.carts.find_one({"user_id": user_id})
  if not cart or not cart.get("items"):
    return None
  return Cart(**serialize_doc(cart) | {"id": str(cart["_id"])})


ALLOWED_RECEIPT_MIME_TYPES = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
}
MAX_RECEIPT_SIZE_BYTES = settings.max_receipt_size_mb * 1024 * 1024


def _save_payment_receipt(file: UploadFile) -> tuple[str, str | None]:
  content_type = (file.content_type or "").lower()
  extension = ALLOWED_RECEIPT_MIME_TYPES.get(content_type)
  if not extension:
    original_suffix = Path(file.filename or "").suffix.lower()
    if original_suffix in {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".heic", ".heif"}:
      extension = original_suffix
    else:
      raise HTTPException(
        status_code=400,
        detail="Поддерживаются только изображения (JPG, PNG, WEBP, HEIC) или PDF",
      )

  file.file.seek(0)
  file_bytes = file.file.read()
  if not file_bytes:
    raise HTTPException(status_code=400, detail="Файл чека пустой")
  if len(file_bytes) > MAX_RECEIPT_SIZE_BYTES:
    raise HTTPException(
      status_code=400,
      detail=f"Файл слишком большой. Максимум {settings.max_receipt_size_mb} МБ",
    )

  filename = f"{uuid4().hex}{extension}"
  target_path = settings.upload_dir / filename
  target_path.parent.mkdir(parents=True, exist_ok=True)
  with open(target_path, "wb") as destination:
    destination.write(file_bytes)

  return f"/uploads/{filename}", file.filename


@router.post("/order", response_model=Order, status_code=status.HTTP_201_CREATED)
async def create_order(
  name: str = Form(...),
  phone: str = Form(...),
  address: str = Form(...),
  comment: str | None = Form(None),
  delivery_type: str | None = Form(None),
  payment_type: str | None = Form(None),
  payment_receipt: UploadFile = File(...),
  db: AsyncIOMotorDatabase = Depends(get_db),
  current_user: TelegramUser = Depends(get_current_user),
):
  user_id = current_user.id
  cart = await get_cart(db, user_id)
  if not cart:
    raise HTTPException(status_code=400, detail="Корзина пуста")

  # Товары уже списаны при добавлении в корзину, только проверяем наличие
  # (на случай, если количество изменилось на складе)
  for cart_item in cart.items:
    if cart_item.variant_id:
      try:
        product_oid = as_object_id(cart_item.product_id)
        product = await db.products.find_one({"_id": product_oid})
        if product:
          variants = product.get("variants", [])
          variant = next((v for v in variants if v.get("id") == cart_item.variant_id), None)
          if variant:
            variant_quantity = variant.get("quantity", 0)
            # Проверяем, что товар все еще доступен (должен быть >= 0, так как уже списан)
            if variant_quantity < 0:
              raise HTTPException(
                status_code=400,
                detail=f"Товар '{cart_item.product_name}' ({variant.get('name', '')}) больше не доступен"
              )
      except ValueError:
        pass  # Игнорируем ошибки парсинга ObjectId

  receipt_url, original_filename = _save_payment_receipt(payment_receipt)

  order_doc = {
    "user_id": user_id,
    "customer_name": name,
    "customer_phone": phone,
    "delivery_address": address,
    "comment": comment,
    "status": OrderStatus.PROCESSING.value,
    "items": [item.dict() for item in cart.items],  # Преобразуем CartItem объекты в словари
    "total_amount": cart.total_amount,
    "can_edit_address": True,
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow(),
    "payment_receipt_url": receipt_url,
    "payment_receipt_filename": original_filename,
    "delivery_type": delivery_type,
    "payment_type": payment_type,
  }

  try:
    result = await db.orders.insert_one(order_doc)
  except Exception:
    stored_path = settings.upload_dir / Path(receipt_url).name
    if stored_path.exists():
      stored_path.unlink(missing_ok=True)
    raise

  await db.carts.delete_one({"_id": as_object_id(cart.id)})
  doc = await db.orders.find_one({"_id": result.inserted_id})
  order = Order(**serialize_doc(doc) | {"id": str(doc["_id"])})
  
  # Отправляем уведомление администраторам о новом заказе
  try:
    await notify_admins_new_order(
      order_id=order.id,
      customer_name=name,
      customer_phone=phone,
      total_amount=cart.total_amount,
      items_count=len(cart.items),
      receipt_url=receipt_url,
    )
  except Exception as e:
    # Логируем ошибку, но не прерываем создание заказа
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Ошибка при отправке уведомления о новом заказе {order.id}: {e}")
  
  return order


@router.get("/order/last", response_model=Order | None)
async def get_last_order(
  current_user: TelegramUser = Depends(get_current_user),
  db: AsyncIOMotorDatabase = Depends(get_db),
):
  doc = await db.orders.find_one(
    {"user_id": current_user.id},
    sort=[("created_at", -1)],
  )
  if not doc:
    return None
  return Order(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.get("/order/{order_id}", response_model=Order)
async def get_order_by_id(
  order_id: str,
  current_user: TelegramUser = Depends(get_current_user),
  db: AsyncIOMotorDatabase = Depends(get_db),
):
  doc = await db.orders.find_one(
    {"_id": as_object_id(order_id), "user_id": current_user.id},
  )
  if not doc:
    raise HTTPException(status_code=404, detail="Заказ не найден")
  return Order(**serialize_doc(doc) | {"id": str(doc["_id"])})


@router.patch("/order/{order_id}/address", response_model=Order)
async def update_order_address(
  order_id: str,
  payload: UpdateAddressRequest,
  db: AsyncIOMotorDatabase = Depends(get_db),
  current_user: TelegramUser = Depends(get_current_user),
):
  doc = await db.orders.find_one({"_id": as_object_id(order_id)})
  if not doc or doc["user_id"] != current_user.id:
    raise HTTPException(status_code=404, detail="Заказ не найден")
  editable_statuses = {
    OrderStatus.NEW.value,
    OrderStatus.PROCESSING.value,
  }
  if doc["status"] not in editable_statuses:
    raise HTTPException(status_code=400, detail="Адрес можно менять только для новых заказов или заказов в работе")

  updated = await db.orders.find_one_and_update(
    {"_id": as_object_id(order_id)},
    {
      "$set": {
        "delivery_address": payload.address,
        "updated_at": datetime.utcnow(),
        "can_edit_address": True,
      }
    },
    return_document=True,
  )
  return Order(**serialize_doc(updated) | {"id": str(updated["_id"])})

