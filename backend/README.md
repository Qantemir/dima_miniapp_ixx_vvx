# Mini Shop Backend

FastAPI + MongoDB backend for the Telegram mini-app.

## Requirements

- Python 3.11+
- MongoDB 6+

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Environment variables (shared `.env` in project root)

Duplicate `env.example` → `.env` in the repository root and edit:

```
MONGO_URI=mongodb://localhost:27017
MONGO_DB=miniapp
ADMIN_IDS=123456,987654
TELEGRAM_BOT_TOKEN=your_bot_token  # Обязательно для работы рассылки
JWT_SECRET=change-me
VITE_API_URL=http://localhost:8000/api
VITE_ADMIN_IDS=123456,987654
VITE_PUBLIC_URL=https://miniapp.local
```

## Run server

**Local development:**
```bash
uvicorn app.main:app --reload --port 8000
```

**Production (Railway):**
Railway автоматически предоставляет переменную окружения `PORT`. Используйте:
```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Или в `Procfile` (для Railway):
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

The API will be available at `http://localhost:8000/api` (local) or `https://your-app.railway.app/api` (Railway).

## Collections

- `categories` - категории товаров
- `products` - товары
- `carts` - корзины пользователей
- `orders` - заказы
- `broadcasts` - история рассылок
- `store_status` - статус магазина (режим сна)
- `customers` - список клиентов (Telegram ID) для рассылки

Indexes are created automatically on insert. Use MongoDB Compass to inspect data.

## Рассылка

Система рассылки работает следующим образом:

1. **Сбор клиентов**: Когда пользователь добавляет товар в корзину, его Telegram ID автоматически сохраняется в коллекцию `customers`.

2. **Отправка рассылки**: При создании рассылки через админ-панель (`/admin/broadcast`), система:
   - Получает все Telegram ID из коллекции `customers`
   - Отправляет сообщения через Telegram Bot API
   - Подсчитывает количество успешно отправленных сообщений

3. **Очистка базы**: Если отправка не удалась (пользователь заблокировал/удалил бота, невалидный ID), такой Telegram ID автоматически удаляется из базы данных.

**Важно**: Для работы рассылки необходимо указать `TELEGRAM_BOT_TOKEN` в `.env` файле. Получить токен можно у [@BotFather](https://t.me/BotFather) в Telegram.

