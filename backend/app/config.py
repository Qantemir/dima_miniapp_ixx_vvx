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

  @validator("admin_ids", pre=True)
  def split_admin_ids(cls, value):
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
  return Settings()


settings = get_settings()

