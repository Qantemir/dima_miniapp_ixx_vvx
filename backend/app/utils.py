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


async def restore_variant_quantity(
  db: AsyncIOMotorDatabase,
  product_id: str,
  variant_id: str,
  quantity: int
):
  """Возвращает количество товара на склад"""
  try:
    product_oid = as_object_id(product_id)
    product = await db.products.find_one({"_id": product_oid})
    if product:
      variants = product.get("variants", [])
      variant = next((v for v in variants if v.get("id") == variant_id), None)
      if variant:
        variant["quantity"] = variant.get("quantity", 0) + quantity
        await db.products.update_one(
          {"_id": product_oid},
          {"$set": {"variants": variants}}
        )
  except ValueError:
    pass  # Игнорируем ошибки парсинга ObjectId
