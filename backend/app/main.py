import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import close_mongo_connection, connect_to_mongo
from .utils import permanently_delete_order_entry
from .routers import admin, bot_webhook, cart, catalog, orders, store

app = FastAPI(title="Mini Shop Telegram Backend", version="1.0.0")

# Middleware для исключения streaming responses из gzip сжатия
# Должен быть добавлен ПЕРЕД GZipMiddleware, чтобы выполняться первым
from starlette.middleware.base import BaseHTTPMiddleware

class SkipGzipForStreamingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path.endswith("/stream"):
            # Убираем Accept-Encoding заголовок для streaming эндпоинтов
            # чтобы GZipMiddleware не применялся
            if "accept-encoding" in request.headers:
                # Создаем новый scope без accept-encoding
                new_headers = [
                    (k, v) for k, v in request.scope.get("headers", [])
                    if k.lower() != b"accept-encoding"
                ]
                request.scope["headers"] = new_headers
        
        response = await call_next(request)
        return response

# Добавляем middleware для исключения streaming из gzip ПЕРЕД GZipMiddleware
app.add_middleware(SkipGzipForStreamingMiddleware)

# Добавляем сжатие ответов для ускорения передачи данных (уменьшает размер на 70-80%)
# Примечание: streaming responses (SSE) исключаются через middleware выше
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Монтируем статические файлы фронтенда (dist папка)
import os
from pathlib import Path

# Определяем путь к dist папке относительно backend/app/main.py
backend_dir = Path(__file__).parent.parent
project_root = backend_dir.parent
dist_dir = project_root / "dist"

if dist_dir.exists():
    # Монтируем статические файлы фронтенда (assets, favicon, robots.txt и т.д.)
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")
    
    # Монтируем корневые статические файлы (favicon.svg, robots.txt, sitemap.xml)
    @app.get("/favicon.svg")
    async def favicon():
        from fastapi.responses import FileResponse
        favicon_path = dist_dir / "favicon.svg"
        if favicon_path.exists():
            return FileResponse(str(favicon_path))
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    
    @app.get("/robots.txt")
    async def robots():
        from fastapi.responses import FileResponse
        robots_path = dist_dir / "robots.txt"
        if robots_path.exists():
            return FileResponse(str(robots_path))
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    
    @app.get("/sitemap.xml")
    async def sitemap():
        from fastapi.responses import FileResponse
        sitemap_path = dist_dir / "sitemap.xml"
        if sitemap_path.exists():
            return FileResponse(str(sitemap_path))
        from fastapi import HTTPException
        raise HTTPException(status_code=404)


@app.middleware("http")
async def apply_security_headers(request, call_next):
  response = await call_next(request)
  # Убрали Permissions-Policy заголовок, чтобы избежать ошибок с browsing-topics
  # response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
  return response


async def cleanup_deleted_orders():
  """
  Фоновая задача для окончательного удаления заказов,
  которые были помечены как удаленные более 10 минут назад.
  """
  from datetime import datetime, timedelta
  from .database import get_db
  from .utils import permanently_delete_order_entry
  
  import asyncio
  logger = logging.getLogger(__name__)
  
  while True:
    try:
      # Получаем базу данных
      db = await get_db()
      
      # Находим заказы, удаленные более 10 минут назад
      cutoff_time = datetime.utcnow() - timedelta(minutes=10)
      deleted_orders = await db.orders.find({
        "deleted_at": {"$exists": True, "$lte": cutoff_time}
      }).to_list(length=100)
      
      for order_doc in deleted_orders:
        try:
          await permanently_delete_order_entry(db, order_doc)
          logger.info(f"Окончательно удален заказ {order_doc.get('_id')}")
        except Exception as e:
          logger.error(f"Ошибка при окончательном удалении заказа {order_doc.get('_id')}: {e}")
      
      # Ждем 1 минуту перед следующей проверкой
      await asyncio.sleep(60)
    except Exception as e:
      logger.error(f"Ошибка в фоновой задаче очистки заказов: {e}")
      await asyncio.sleep(60)


@app.on_event("startup")
async def startup():
  # Подключаемся к MongoDB при старте для быстрого первого запроса
  await connect_to_mongo()
  
  # Запускаем фоновую задачу для очистки удаленных заказов
  import asyncio
  asyncio.create_task(cleanup_deleted_orders())
  
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
  """
  Обработка shutdown события.
  Примечание: ошибки gzip (RuntimeError: lost gzip_file) при остановке контейнера
  не критичны - они уже помечены как "Exception ignored" в Python и не влияют
  на работу приложения. Это происходит потому что файловые дескрипторы закрываются
  раньше, чем gzip-стримы успевают закрыться.
  """
  logger = logging.getLogger(__name__)
  try:
    await close_mongo_connection()
    logger.info("MongoDB соединение закрыто")
  except Exception as e:
    logger.warning(f"Ошибка при закрытии соединения с MongoDB: {e}")


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

# SPA fallback - должен быть последним, после всех роутеров
if dist_dir.exists():
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Пропускаем API пути и уже обработанные статические файлы
        if full_path.startswith("api/") or full_path.startswith("uploads/") or full_path.startswith("assets/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        
        # Отдаём index.html для всех остальных путей (SPA routing)
        from fastapi.responses import FileResponse
        index_path = dist_dir / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path), media_type="text/html")
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Frontend not built")

