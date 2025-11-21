from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import BaseSettings, Field, validator

ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"


class Settings(BaseSettings):
  mongo_uri: str = Field("mongodb://localhost:27017", env="MONGO_URI")
  mongo_db: str = Field("miniapp", env="MONGO_DB")
  api_prefix: str = "/api"
  admin_ids: List[int] = Field(default_factory=list, env="ADMIN_IDS")
  telegram_bot_token: str | None = Field(None, env="TELEGRAM_BOT_TOKEN")
  jwt_secret: str = Field("change-me", env="JWT_SECRET")
  upload_dir: Path = Field(ROOT_DIR / "uploads", env="UPLOAD_DIR")
  max_receipt_size_mb: int = Field(10, env="MAX_RECEIPT_SIZE_MB")
  telegram_data_ttl_seconds: int = Field(300, env="TELEGRAM_DATA_TTL_SECONDS")
  allow_dev_requests: bool = Field(True, env="ALLOW_DEV_REQUESTS")
  dev_allowed_user_ids: List[int] = Field(default_factory=list, env="DEV_ALLOWED_USER_IDS")
  default_dev_user_id: int | None = Field(1, env="DEFAULT_DEV_USER_ID")
  catalog_cache_ttl_seconds: int = Field(30, env="CATALOG_CACHE_TTL_SECONDS")
  broadcast_batch_size: int = Field(25, env="BROADCAST_BATCH_SIZE")
  broadcast_concurrency: int = Field(10, env="BROADCAST_CONCURRENCY")
  environment: str = Field("development", env="ENVIRONMENT")

  @validator("admin_ids", pre=True)
  def split_admin_ids(cls, value):
    if not value:
      return []
    if isinstance(value, list):
      return [int(v) for v in value]
    return [int(v.strip()) for v in str(value).split(",") if v.strip()]

  @validator("upload_dir", pre=True)
  def ensure_upload_dir(cls, value):
    if isinstance(value, Path):
      return value
    return Path(value)

  @validator("dev_allowed_user_ids", pre=True)
  def split_dev_ids(cls, value):
    if not value:
      return []
    if isinstance(value, list):
      return [int(v) for v in value]
    return [int(v.strip()) for v in str(value).split(",") if v.strip()]

  class Config:
    env_file = ENV_PATH
    env_file_encoding = "utf-8"
    case_sensitive = False


@lru_cache
def get_settings() -> Settings:
  settings = Settings()
  settings.upload_dir.mkdir(parents=True, exist_ok=True)
  return settings


settings = get_settings()

