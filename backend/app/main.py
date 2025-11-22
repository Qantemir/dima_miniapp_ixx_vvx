from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import close_mongo_connection, connect_to_mongo
from .routers import admin, bot_webhook, cart, catalog, orders, store

app = FastAPI(title="Mini Shop Telegram Backend", version="1.0.0")

# Добавляем сжатие ответов для ускорения передачи данных (уменьшает размер на 70-80%)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.middleware("http")
async def apply_security_headers(request, call_next):
  response = await call_next(request)
  # Убрали Permissions-Policy заголовок, чтобы избежать ошибок с browsing-topics
  # response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
  return response


@app.on_event("startup")
async def startup():
  # Подключаемся к MongoDB при старте для быстрого первого запроса
  await connect_to_mongo()
  
  # Настраиваем webhook для Telegram Bot API (если указан публичный URL)
  if settings.telegram_bot_token and settings.public_url:
    try:
      import httpx
      webhook_url = f"{settings.public_url.rstrip('/')}{settings.api_prefix}/bot/webhook"
      async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
          f"https://api.telegram.org/bot{settings.telegram_bot_token}/setWebhook",
          json={"url": webhook_url}
        )
        result = response.json()
        if result.get("ok"):
          import logging
          logger = logging.getLogger(__name__)
          logger.info(f"Webhook настроен: {webhook_url}")
        else:
          import logging
          logger = logging.getLogger(__name__)
          logger.warning(f"Не удалось настроить webhook: {result.get('description', 'Unknown error')}")
    except Exception as e:
      import logging
      logger = logging.getLogger(__name__)
      logger.error(f"Ошибка при настройке webhook: {e}")


@app.on_event("shutdown")
async def shutdown():
  await close_mongo_connection()


app.include_router(catalog.router, prefix=settings.api_prefix)
app.include_router(cart.router, prefix=settings.api_prefix)
app.include_router(orders.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
app.include_router(store.router, prefix=settings.api_prefix)
app.include_router(bot_webhook.router, prefix=settings.api_prefix)


@app.get("/")
async def root():
  return {"message": "Mini Shop API is running"}

@app.get("/health")
async def health():
  """Health check endpoint that doesn't require database."""
  return {"status": "ok", "message": "Server is running"}

