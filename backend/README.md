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
TELEGRAM_BOT_TOKEN=your_bot_token  # optional
JWT_SECRET=change-me
VITE_API_URL=http://localhost:8000/api
VITE_ADMIN_IDS=123456,987654
VITE_USE_MOCK_CATALOG=false        # set to true when backend is offline
```

## Run server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000/api`.

## Collections

- `categories`
- `products`
- `carts`
- `orders`
- `broadcasts`
- `store_status`

Indexes are created automatically on insert. Use MongoDB Compass to inspect data.

