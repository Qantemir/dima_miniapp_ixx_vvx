#!/bin/bash

# Скрипт для развертывания приложения через Docker

set -e

echo "🚀 Развертывание Mini Shop через Docker..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден. Создайте его на основе .env.example"
    echo "   cp .env.example .env"
    exit 1
fi

# Собираем образ
echo "📦 Сборка Docker образа..."
docker-compose -f docker-compose.prod.yml build

# Запускаем сервисы
echo "🚀 Запуск сервисов..."
docker-compose -f docker-compose.prod.yml up -d

# Ждем готовности сервисов
echo "⏳ Ожидание готовности сервисов..."
sleep 5

# Проверяем статус
echo "📊 Статус сервисов:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Развертывание завершено!"
echo ""
echo "📝 Полезные команды:"
echo "   Логи:              docker-compose -f docker-compose.prod.yml logs -f"
echo "   Остановить:        docker-compose -f docker-compose.prod.yml down"
echo "   Перезапустить:    docker-compose -f docker-compose.prod.yml restart"
echo "   Статус:           docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "🌐 Приложение доступно на: http://localhost:8000"

