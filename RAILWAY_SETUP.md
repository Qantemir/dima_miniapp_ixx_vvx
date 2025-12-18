# Настройка раздельного деплоя на Railway

## Структура

Проект разделен на два независимых сервиса:
- **Backend** (Python FastAPI) - в папке `backend/`
- **Frontend** (React + Vite) - в корне проекта

## Шаги настройки на Railway

### 1. Создание сервисов

1. В Railway создайте **новый проект**
2. Добавьте **два сервиса**:
   - **Backend Service** - подключите репозиторий и укажите **Root Directory: `backend`**
   - **Frontend Service** - подключите тот же репозиторий, но **Root Directory оставьте пустым** (корень проекта)

### 2. Настройка Backend Service

**Root Directory:** `backend`

**Build Command:** (Railway автоматически использует `backend/nixpacks.toml`)

**Start Command:** (автоматически из `backend/nixpacks.toml`)

**Переменные окружения:**
```
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
PUBLIC_URL=https://your-backend-service.railway.app
ENVIRONMENT=production
```

**Важно:** После деплоя бэкенда скопируйте его публичный URL (например, `https://your-backend-service.railway.app`)

### 3. Настройка Frontend Service

**Root Directory:** (пусто, корень проекта)

**Build Command:** (Railway автоматически использует `frontend.nixpacks.toml`)

**Start Command:** (автоматически из `frontend.nixpacks.toml`)

**Переменные окружения:**
```
VITE_API_URL=https://your-backend-service.railway.app/api
NODE_ENV=production
```

**Важно:** 
- Замените `your-backend-service.railway.app` на реальный URL вашего бэкенд-сервиса
- URL должен заканчиваться на `/api` (например: `https://backend.railway.app/api`)

### 4. Настройка доменов (опционально)

1. В каждом сервисе перейдите в **Settings → Domains**
2. Добавьте кастомный домен или используйте Railway домен
3. Для фронтенда настройте домен (например, `app.yourdomain.com`)
4. Для бэкенда настройте домен (например, `api.yourdomain.com`)
5. Обновите `VITE_API_URL` во фронтенде на новый домен бэкенда

### 5. Проверка работы

1. **Backend Health Check:** `https://your-backend-service.railway.app/health`
2. **Frontend:** Откройте URL фронтенд-сервиса в браузере
3. Проверьте, что фронтенд может обращаться к API бэкенда

## Структура файлов конфигурации

- `backend/nixpacks.toml` - конфигурация сборки бэкенда
- `frontend.nixpacks.toml` - конфигурация сборки фронтенда
- `frontend.Procfile` - альтернативный способ запуска фронтенда (если Railway не использует nixpacks)

## Troubleshooting

### Фронтенд не может подключиться к бэкенду

1. Проверьте переменную `VITE_API_URL` во фронтенде
2. Убедитесь, что URL бэкенда доступен публично
3. Проверьте CORS настройки в бэкенде (должен быть `allow_origins=["*"]`)

### Ошибки сборки

1. **Backend:** Убедитесь, что `backend/requirements.txt` содержит все зависимости
2. **Frontend:** Убедитесь, что `package.json` содержит все зависимости (включая `serve`)

### Проблемы с путями

- Backend должен быть в `Root Directory: backend`
- Frontend должен быть в корне проекта (Root Directory пустой)

