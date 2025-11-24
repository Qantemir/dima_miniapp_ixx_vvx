"""
Утилиты для отправки уведомлений администраторам через Telegram Bot API.
"""
import asyncio
import json
import logging
import httpx
from pathlib import Path
from bson import ObjectId
from gridfs import GridFS
from motor.motor_asyncio import AsyncIOMotorDatabase

from .config import get_settings

logger = logging.getLogger(__name__)


def format_amount(amount: float) -> str:
    """
    Форматирует сумму, убирая .00 для целых чисел.
    
    Args:
        amount: Сумма для форматирования
        
    Returns:
        Отформатированная строка суммы
    """
    if amount == int(amount):
        return str(int(amount))
    return f"{amount:.2f}".rstrip('0').rstrip('.')


async def notify_admins_new_order(
    order_id: str,
    customer_name: str,
    customer_phone: str,
    delivery_address: str,
    total_amount: float,
    items_count: int,
    receipt_file_id: str,
    db: AsyncIOMotorDatabase,
) -> None:
    """
    Отправляет уведомление всем администраторам о новом заказе с фото чека.
    
    Args:
        order_id: ID заказа
        customer_name: Имя клиента
        customer_phone: Телефон клиента
        delivery_address: Адрес доставки
        total_amount: Общая сумма заказа
        items_count: Количество товаров в заказе
        receipt_file_id: ID файла чека в GridFS
        db: База данных для доступа к GridFS
    """
    settings = get_settings()
    
    # Проверяем наличие токена бота
    if not settings.telegram_bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN не настроен. Уведомления не будут отправлены.")
        return
    
    # Проверяем наличие администраторов
    if not settings.admin_ids:
        logger.warning("ADMIN_IDS не настроен. Уведомления не будут отправлены.")
        return
    
    # Формируем ссылку на 2ГИС для адреса
    from urllib.parse import quote
    
    # Кодируем оригинальный адрес со всеми символами включая "/"
    # Символ "/" будет закодирован как "%2F"
    address_encoded = quote(delivery_address, safe='')
    
    # Используем формат с путем - 2ГИС должен правильно обработать закодированный адрес
    # Используем 2gis.kz для Казахстана (так как используется тенге)
    # Формат: https://2gis.kz/search/закодированный_адрес
    # Например: "Ломова 181/2" -> "https://2gis.kz/search/%D0%9B%D0%BE%D0%BC%D0%BE%D0%B2%D0%B0%20181%2F2"
    address_2gis_url = f"https://2gis.kz/search/{address_encoded}"
    
    # В ссылке показываем оригинальный адрес с "/"
    address_link = f"[{delivery_address}]({address_2gis_url})"
    
    # Формируем текст сообщения
    message = (
        f"🆕 *Новый заказ!*\n\n"
        f"📋 Заказ: `{order_id[-6:]}`\n"
        f"👤 Клиент: {customer_name}\n"
        f"📞 Телефон: {customer_phone}\n"
        f"📍 Адрес: {address_link}\n"
        f"💰 Сумма: {format_amount(total_amount)} ₸\n"
        f"📦 Товаров: {items_count}"
    )
    
    # Получаем файл чека из GridFS
    receipt_data = None
    receipt_filename = None
    receipt_content_type = None
    if receipt_file_id:
        try:
            fs = GridFS(db.database)
            grid_file = fs.get(ObjectId(receipt_file_id))
            receipt_data = grid_file.read()
            receipt_filename = grid_file.filename
            receipt_content_type = grid_file.content_type
        except Exception as e:
            logger.warning(f"Не удалось загрузить файл чека из GridFS: {e}")
            receipt_data = None
    
    # Отправляем уведомление каждому администратору
    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = []
        for admin_id in settings.admin_ids:
            tasks.append(
                _send_notification_with_receipt(
                    client, 
                    settings.telegram_bot_token, 
                    admin_id, 
                    message, 
                    receipt_data,
                    receipt_filename,
                    receipt_content_type,
                    order_id
                )
            )
        
        # Выполняем все отправки параллельно
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Логируем результаты
        success_count = sum(1 for r in results if r is True)
        failed_count = len(results) - success_count
        
        if success_count > 0:
            logger.info(f"Уведомления о новом заказе {order_id} отправлены {success_count} администраторам")
        if failed_count > 0:
            logger.warning(f"Не удалось отправить уведомления {failed_count} администраторам")


async def _send_notification_with_receipt(
    client: httpx.AsyncClient,
    bot_token: str,
    admin_id: int,
    message: str,
    receipt_data: bytes | None,
    receipt_filename: str | None,
    receipt_content_type: str | None,
    order_id: str,
) -> bool:
    """
    Отправляет уведомление администратору с фото чека.
    
    Returns:
        True если отправка успешна, False в противном случае
    """
    try:
        file_sent = False
        # Сначала отправляем фото/документ чека, если он есть
        if receipt_data and receipt_filename:
            # Определяем тип файла по расширению или content_type
            file_extension = Path(receipt_filename).suffix.lower()
            is_image = file_extension in {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'} or (
                receipt_content_type and receipt_content_type.startswith('image/')
            )
            is_pdf = file_extension == '.pdf' or receipt_content_type == 'application/pdf'
            
            if is_image:
                # Отправляем как фото с подписью
                api_method = "sendPhoto"
                file_field = "photo"
            elif is_pdf:
                # Отправляем как документ
                api_method = "sendDocument"
                file_field = "document"
            else:
                # Для других форматов отправляем как документ
                api_method = "sendDocument"
                file_field = "document"
            
            api_url = f"https://api.telegram.org/bot{bot_token}/{api_method}"
            
            # Используем данные из GridFS
            file_data = receipt_data
            
            # Создаем inline-кнопки для изменения статуса заказа
            keyboard = {
                "inline_keyboard": [
                    [
                        {
                            "text": "✅ Принят",
                            "callback_data": f"status|{order_id}|принят"
                        },
                        {
                            "text": "🚚 Выехал",
                            "callback_data": f"status|{order_id}|выехал"
                        }
                    ],
                    [
                        {
                            "text": "🎉 Завершён",
                            "callback_data": f"status|{order_id}|завершён"
                        },
                        {
                            "text": "❌ Отменить",
                            "callback_data": f"status|{order_id}|отменён"
                        }
                    ]
                ]
            }
            
            # Отправляем файл с подписью и кнопкой
            files = {file_field: (receipt_filename, file_data)}
            data = {
                "chat_id": admin_id,
                "caption": message,
                "parse_mode": "Markdown",
                "reply_markup": json.dumps(keyboard),
            }
            
            response = await client.post(api_url, data=data, files=files)
            result = response.json()
            
            if result.get("ok"):
                file_sent = True
                return True
            else:
                logger.warning(
                    f"Не удалось отправить чек администратору {admin_id}: "
                    f"{result.get('description', 'Unknown error')}"
                )
                # Продолжаем отправку текстового сообщения если файл не отправился
                file_sent = False
        
        # Отправляем текстовое сообщение (если файл не отправился или его нет)
        if not file_sent:
            # Создаем inline-кнопки для изменения статуса заказа
            keyboard = {
                "inline_keyboard": [
                    [
                        {
                            "text": "✅ Принят",
                            "callback_data": f"status|{order_id}|принят"
                        },
                        {
                            "text": "🚚 Выехал",
                            "callback_data": f"status|{order_id}|выехал"
                        }
                    ],
                    [
                        {
                            "text": "🎉 Завершён",
                            "callback_data": f"status|{order_id}|завершён"
                        },
                        {
                            "text": "❌ Отменить",
                            "callback_data": f"status|{order_id}|отменён"
                        }
                    ]
                ]
            }
            
            api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            response = await client.post(
                api_url,
                json={
                    "chat_id": admin_id,
                    "text": message,
                    "parse_mode": "Markdown",
                    "reply_markup": keyboard,
                },
            )
            result = response.json()
            if not result.get("ok"):
                logger.warning(
                    f"Не удалось отправить уведомление администратору {admin_id}: "
                    f"{result.get('description', 'Unknown error')}"
                )
                return False
        
        return True
    except Exception as e:
        logger.error(f"Ошибка при отправке уведомления администратору {admin_id}: {e}")
        return False


async def notify_customer_order_status(
    user_id: int,
    order_id: str,
    order_status: str,
    customer_name: str | None = None,
) -> None:
    """
    Отправляет уведомление клиенту об изменении статуса заказа.
    
    Args:
        user_id: Telegram ID клиента
        order_id: ID заказа
        order_status: Новый статус заказа
        customer_name: Имя клиента (опционально, для персонализации)
    """
    settings = get_settings()
    
    # Проверяем наличие токена бота
    if not settings.telegram_bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN не настроен. Уведомления клиентам не будут отправлены.")
        return
    
    # Формируем сообщение в зависимости от статуса
    status_messages = {
        "принят": "✅ Ваш заказ принят в обработку!",
        "в обработке": "🔄 Ваш заказ обрабатывается...",
        "выехал": "🚚 Ваш заказ выехал! Скоро будет доставлен.",
        "завершён": "🎉 Ваш заказ завершён! Спасибо за покупку!",
        "отменён": "❌ Ваш заказ отменён.",
    }
    
    # Получаем сообщение для статуса
    status_message = status_messages.get(order_status, f"Статус вашего заказа изменён: {order_status}")
    
    # Формируем полное сообщение
    message = (
        f"{status_message}\n\n"
        f"📋 Заказ: `{order_id[-6:]}`\n"
        f"📊 Статус: *{order_status}*"
    )
    
    # Отправляем уведомление клиенту
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
            response = await client.post(
                api_url,
                json={
                    "chat_id": user_id,
                    "text": message,
                    "parse_mode": "Markdown",
                },
            )
            result = response.json()
            
            if result.get("ok"):
                logger.info(f"Уведомление о статусе заказа {order_id} отправлено клиенту {user_id}")
            else:
                error_description = result.get("description", "Unknown error")
                # Не логируем как ошибку, если пользователь заблокировал бота
                if "blocked" in error_description.lower() or "chat not found" in error_description.lower():
                    logger.debug(f"Клиент {user_id} заблокировал бота или чат не найден")
                else:
                    logger.warning(
                        f"Не удалось отправить уведомление клиенту {user_id} о заказе {order_id}: "
                        f"{error_description}"
                    )
    except Exception as e:
        logger.error(f"Ошибка при отправке уведомления клиенту {user_id} о заказе {order_id}: {e}")

