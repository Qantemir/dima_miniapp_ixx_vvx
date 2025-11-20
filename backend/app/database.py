import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from .config import settings

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None
_indexes_initialized = False


async def connect_to_mongo():
  """Подключается к MongoDB. Вызывается лениво при первом использовании."""
  global client, db
  if client is None:
    try:
      client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
      db = client[settings.mongo_db]
      await ensure_indexes(db)
      # Проверяем подключение
      await client.admin.command('ping')
      logger.info(f"Connected to MongoDB at {settings.mongo_uri}")
    except Exception as e:
      logger.error(f"Failed to connect to MongoDB: {e}")
      logger.error("Server will start but database operations will fail. Please start MongoDB.")
      # Создаем клиент даже если подключение не удалось, чтобы не падать при каждом запросе
      client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
      db = client[settings.mongo_db]
      await ensure_indexes(db)


async def ensure_db_connection():
  """Убеждается, что подключение к БД установлено."""
  if client is None:
    await connect_to_mongo()


async def close_mongo_connection():
  global client
  if client:
    client.close()
    client = None


async def get_db() -> AsyncIOMotorDatabase:
  """Получает подключение к БД, подключаясь при необходимости."""
  if client is None or db is None:
    await ensure_db_connection()
  if db is None:
    raise RuntimeError("Database is not initialized")
  return db


async def ensure_indexes(database: AsyncIOMotorDatabase):
  global _indexes_initialized
  if _indexes_initialized:
    return
  await database.categories.create_index("name", unique=True)
  await database.products.create_index([("category_id", ASCENDING)])
  await database.carts.create_index("user_id", unique=True)
  await database.orders.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
  await database.orders.create_index([("created_at", DESCENDING)])
  await database.orders.create_index("status")
  await database.customers.create_index("telegram_id", unique=True)
  await database.store_status.create_index("updated_at")
  _indexes_initialized = True

