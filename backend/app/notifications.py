"""
Утилиты для отправки уведомлений администраторам через Telegram Bot API.
"""
import asyncio
import logging
import httpx

from .config import get_settings

logger = logging.getLogger(__name__)


async def notify_admins_new_order(
    order_id: str,
    customer_name: str,
    customer_phone: str,
    total_amount: float,
    items_count: int,
) -> None:
    """
    Отправляет уведомление всем администраторам о новом заказе.
    
    Args:
        order_id: ID заказа
        customer_name: Имя клиента
        customer_phone: Телефон клиента
        total_amount: Общая сумма заказа
        items_count: Количество товаров в заказе
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
    
    # Формируем текст сообщения
    message = (
        f"🆕 *Новый заказ!*\n\n"
        f"📋 Заказ: `{order_id[-6:]}`\n"
        f"👤 Клиент: {customer_name}\n"
        f"📞 Телефон: {customer_phone}\n"
        f"💰 Сумма: {total_amount:.2f} ₽\n"
        f"📦 Товаров: {items_count}"
    )
    
    # URL для отправки сообщений через Telegram Bot API
    bot_api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    
    # Отправляем уведомление каждому администратору
    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = []
        for admin_id in settings.admin_ids:
            tasks.append(_send_notification(client, bot_api_url, admin_id, message))
        
        # Выполняем все отправки параллельно
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Логируем результаты
        success_count = sum(1 for r in results if r is True)
        failed_count = len(results) - success_count
        
        if success_count > 0:
            logger.info(f"Уведомления о новом заказе {order_id} отправлены {success_count} администраторам")
        if failed_count > 0:
            logger.warning(f"Не удалось отправить уведомления {failed_count} администраторам")


async def _send_notification(
    client: httpx.AsyncClient,
    bot_api_url: str,
    admin_id: int,
    message: str,
) -> bool:
    """
    Отправляет одно уведомление администратору.
    
    Returns:
        True если отправка успешна, False в противном случае
    """
    try:
        response = await client.post(
            bot_api_url,
            json={
                "chat_id": admin_id,
                "text": message,
                "parse_mode": "Markdown",
            },
        )
        result = response.json()
        if result.get("ok"):
            return True
        else:
            logger.warning(
                f"Не удалось отправить уведомление администратору {admin_id}: "
                f"{result.get('description', 'Unknown error')}"
            )
            return False
    except Exception as e:
        logger.error(f"Ошибка при отправке уведомления администратору {admin_id}: {e}")
        return False

