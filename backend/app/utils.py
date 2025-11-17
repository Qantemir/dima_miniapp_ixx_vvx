from bson import ObjectId


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

