from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


def serialize_doc(doc):
  if not doc:
    return doc
  result = {}
  for key, value in doc.items():
    if isinstance(value, ObjectId):
      result[key] = str(value)
    elif isinstance(value, list):
      result[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
    elif isinstance(value, dict):
      result[key] = serialize_doc(value)
    else:
      result[key] = value
  return result


def as_object_id(value: str) -> ObjectId:
  if not ObjectId.is_valid(value):
    raise ValueError("Invalid ObjectId")
  return ObjectId(value)


async def _update_variant_quantity(
  db: AsyncIOMotorDatabase,
  product_id: str,
  variant_id: str,
  quantity_diff: int,
  require_available: bool = False,
) -> bool:
  if quantity_diff == 0:
    return True

  try:
    product_oid = as_object_id(product_id)
  except ValueError:
    return False

  base_filter = {
    "_id": product_oid,
    "variants": {
      "$elemMatch": {
        "id": variant_id,
      }
    }
  }

  if quantity_diff < 0 and require_available:
    base_filter["variants"]["$elemMatch"]["quantity"] = {"$gte": abs(quantity_diff)}

  result = await db.products.update_one(
    base_filter,
    {"$inc": {"variants.$.quantity": quantity_diff}},
  )
  return result.modified_count == 1


async def decrement_variant_quantity(
  db: AsyncIOMotorDatabase,
  product_id: str,
  variant_id: str,
  quantity: int,
) -> bool:
  """Списывает товары со склада с проверкой достаточного количества."""
  if quantity <= 0:
    return True
  return await _update_variant_quantity(
    db,
    product_id,
    variant_id,
    quantity_diff=-quantity,
    require_available=True,
  )


async def restore_variant_quantity(
  db: AsyncIOMotorDatabase,
  product_id: str,
  variant_id: str,
  quantity: int
):
  """Возвращает количество товара на склад"""
  if quantity <= 0:
    return
  await _update_variant_quantity(
    db,
    product_id,
    variant_id,
    quantity_diff=quantity,
    require_available=False,
  )
