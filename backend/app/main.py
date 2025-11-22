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
  import logging
  import os
  logger = logging.getLogger(__name__)
  
  # Проверяем, был ли PUBLIC_URL определен автоматически
  if settings.public_url:
    # Проверяем, был ли он установлен явно через переменную окружения
    explicit_public_url = os.getenv("PUBLIC_URL")
    if explicit_public_url:
      logger.info(f"PUBLIC_URL установлен явно: {settings.public_url}")
    else:
      logger.info(f"PUBLIC_URL определен автоматически из переменных окружения хостинга: {settings.public_url}")
  
  if settings.telegram_bot_token and settings.public_url:
    try:
      import httpx
      webhook_url = f"{settings.public_url.rstrip('/')}{settings.api_prefix}/bot/webhook"
      logger.info(f"Настраиваем webhook: {webhook_url} (PUBLIC_URL: {settings.public_url})")
      
      async with httpx.AsyncClient(timeout=15.0) as client:
        # Сначала удаляем старый webhook (если есть)
        try:
          await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/deleteWebhook",
            json={"drop_pending_updates": False}
          )
        except:
          pass
        
        # Устанавливаем новый webhook
        response = await client.post(
          f"https://api.telegram.org/bot{settings.telegram_bot_token}/setWebhook",
          json={
            "url": webhook_url,
            "allowed_updates": ["callback_query"]  # Только callback queries
          }
        )
        result = response.json()
        if result.get("ok"):
          logger.info(f"✅ Webhook успешно настроен: {webhook_url}")
          
          # Проверяем статус webhook
          check_response = await client.get(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/getWebhookInfo"
          )
          check_result = check_response.json()
          if check_result.get("ok"):
            webhook_info = check_result.get("result", {})
            logger.info(f"Webhook info: url={webhook_info.get('url')}, pending={webhook_info.get('pending_update_count', 0)}")
        else:
          error_desc = result.get("description", "Unknown error")
          logger.error(f"❌ Не удалось настроить webhook: {error_desc}")
          logger.error(f"Проверьте, что URL {webhook_url} доступен из интернета")
    except Exception as e:
      logger.error(f"Ошибка при настройке webhook: {e}", exc_info=True)
  elif settings.telegram_bot_token and not settings.public_url:
    logger.warning("⚠️ TELEGRAM_BOT_TOKEN настроен, но PUBLIC_URL не указан. Webhook не будет настроен автоматически.")
    logger.warning("Добавьте PUBLIC_URL в .env или используйте POST /api/bot/webhook/setup с параметром 'url' для ручной настройки")
    logger.info("Проверьте переменные окружения: RAILWAY_PUBLIC_DOMAIN, RENDER_EXTERNAL_URL, FLY_APP_NAME, VERCEL_URL и др.")
  elif not settings.telegram_bot_token:
    logger.warning("⚠️ TELEGRAM_BOT_TOKEN не настроен. Webhook не будет работать.")


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

