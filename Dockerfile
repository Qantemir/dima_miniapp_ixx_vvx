# Multi-stage build для оптимизации размера образа

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Копируем package files
COPY package*.json ./
COPY yarn.lock* ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходники фронтенда
COPY . .

# Собираем фронтенд
RUN npm run build

# Stage 2: Python backend
FROM python:3.12-slim

WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements и устанавливаем зависимости Python
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем код бэкенда
COPY backend/ /app/

# Копируем собранный фронтенд из stage 1
COPY --from=frontend-builder /app/dist /app/dist

# Создаем директорию для uploads
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# Переменные окружения
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose порт
EXPOSE 8000

# Health check (используем curl вместо requests для простоты)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Запуск приложения
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

