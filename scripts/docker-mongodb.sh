#!/bin/bash

# Скрипт для управления MongoDB через Docker

set -e

case "$1" in
  start)
    echo "🚀 Запуск MongoDB..."
    docker-compose up -d mongodb
    echo "✅ MongoDB запущен"
    echo "📊 Проверка статуса:"
    docker-compose ps mongodb
    ;;
  stop)
    echo "🛑 Остановка MongoDB..."
    docker-compose stop mongodb
    echo "✅ MongoDB остановлен"
    ;;
  restart)
    echo "🔄 Перезапуск MongoDB..."
    docker-compose restart mongodb
    echo "✅ MongoDB перезапущен"
    ;;
  status)
    echo "📊 Статус MongoDB:"
    docker-compose ps mongodb
    echo ""
    echo "💾 Volumes:"
    docker volume ls | grep miniapp_mongodb
    ;;
  logs)
    docker-compose logs -f mongodb
    ;;
  shell)
    echo "🔌 Подключение к MongoDB shell..."
    docker exec -it miniapp_mongodb mongosh miniapp
    ;;
  backup)
    BACKUP_DIR="./backups"
    BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).archive"
    mkdir -p "$BACKUP_DIR"
    echo "💾 Создание бэкапа..."
    docker exec miniapp_mongodb mongodump --archive=/data/backup.archive --gzip
    docker cp miniapp_mongodb:/data/backup.archive "$BACKUP_DIR/$BACKUP_FILE"
    echo "✅ Бэкап создан: $BACKUP_DIR/$BACKUP_FILE"
    ;;
  mongo-express)
    echo "🌐 Запуск MongoDB Express..."
    docker-compose --profile tools up -d mongo-express
    echo "✅ MongoDB Express запущен на http://localhost:8081"
    echo "👤 Логин: admin"
    echo "🔑 Пароль: admin (или значение из MONGO_EXPRESS_PASSWORD)"
    ;;
  clean)
    read -p "⚠️  Вы уверены? Это удалит все данные MongoDB! (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      echo "🗑️  Удаление контейнера и данных..."
      docker-compose down -v mongodb
      echo "✅ Данные удалены"
    else
      echo "❌ Отменено"
    fi
    ;;
  *)
    echo "Использование: $0 {start|stop|restart|status|logs|shell|backup|mongo-express|clean}"
    echo ""
    echo "Команды:"
    echo "  start          - Запустить MongoDB"
    echo "  stop           - Остановить MongoDB"
    echo "  restart        - Перезапустить MongoDB"
    echo "  status         - Показать статус"
    echo "  logs           - Показать логи"
    echo "  shell          - Подключиться к MongoDB shell"
    echo "  backup         - Создать бэкап"
    echo "  mongo-express   - Запустить MongoDB Express (веб-интерфейс)"
    echo "  clean          - Удалить контейнер и данные (ОСТОРОЖНО!)"
    exit 1
    ;;
esac

