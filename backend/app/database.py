from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import settings

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo():
  global client, db
  if client is None:
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]


async def close_mongo_connection():
  global client
  if client:
    client.close()
    client = None


def get_db() -> AsyncIOMotorDatabase:
  if db is None:
    raise RuntimeError("Database is not initialized")
  return db

