"""
Webhook для обработки callback от Telegram Bot API (кнопки в сообщениях).
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
import httpx

from ..database import get_db
from ..config import get_settings
from ..schemas import OrderStatus
from ..utils import as_object_id, serialize_doc
from ..auth import verify_admin
from ..notifications import notify_customer_order_status

router = APIRouter(tags=["bot"])

logger = logging.getLogger(__name__)


@router.post("/bot/webhook")
async def handle_bot_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Обрабатывает webhook от Telegram Bot API (callback от inline-кнопок).
    """
    try:
        data = await request.json()
        
        # Проверяем, что это callback query
        if "callback_query" not in data:
            return {"ok": True}
        
        callback_query = data["callback_query"]
        callback_data = callback_query.get("data", "")
        user_id = callback_query.get("from", {}).get("id")
        message = callback_query.get("message", {})
        message_id = message.get("message_id")
        chat_id = message.get("chat", {}).get("id")
        
        if not user_id:
            return {"ok": True}
        
        # Проверяем, что пользователь - администратор
        settings = get_settings()
        if user_id not in settings.admin_ids:
            # Отвечаем на callback, но не обрабатываем
            await _answer_callback_query(
                callback_query.get("id"),
                "У вас нет прав для выполнения этого действия",
                show_alert=True
            )
            return {"ok": True}
        
        # Обрабатываем callback для принятия заказа
        if callback_data.startswith("accept_order_"):
            order_id = callback_data.replace("accept_order_", "")
            
            # Получаем заказ
            doc = await db.orders.find_one({"_id": as_object_id(order_id)})
            if not doc:
                await _answer_callback_query(
                    callback_query.get("id"),
                    "Заказ не найден",
                    show_alert=True
                )
                return {"ok": True}
            
            # Проверяем, что заказ еще новый
            if doc.get("status") != OrderStatus.NEW.value:
                await _answer_callback_query(
                    callback_query.get("id"),
                    f"Заказ уже обработан. Текущий статус: {doc.get('status')}",
                    show_alert=True
                )
                return {"ok": True}
            
            # Обновляем статус на "принят"
            from datetime import datetime
            updated = await db.orders.find_one_and_update(
                {"_id": as_object_id(order_id)},
                {
                    "$set": {
                        "status": OrderStatus.ACCEPTED.value,
                        "updated_at": datetime.utcnow(),
                        "can_edit_address": False,
                    }
                },
                return_document=True,
            )
            
            if updated:
                # Отвечаем на callback
                await _answer_callback_query(
                    callback_query.get("id"),
                    "✅ Заказ принят!",
                    show_alert=False
                )
                
                # Обновляем сообщение, убирая кнопки
                await _edit_message_reply_markup(
                    settings.telegram_bot_token,
                    chat_id,
                    message_id,
                    None  # Убираем кнопки
                )
                
                # Отправляем уведомление клиенту об изменении статуса
                customer_user_id = updated.get("user_id")
                if customer_user_id:
                    try:
                        await notify_customer_order_status(
                            user_id=customer_user_id,
                            order_id=order_id,
                            order_status=OrderStatus.ACCEPTED.value,
                            customer_name=updated.get("customer_name"),
                        )
                    except Exception as e:
                        logger.error(f"Ошибка при отправке уведомления клиенту о статусе заказа {order_id}: {e}")
                
                logger.info(f"Заказ {order_id} принят администратором {user_id} через кнопку")
            else:
                await _answer_callback_query(
                    callback_query.get("id"),
                    "Ошибка при обновлении заказа",
                    show_alert=True
                )
        
        # Обрабатываем callback для отмены заказа
        elif callback_data.startswith("cancel_order_"):
            order_id = callback_data.replace("cancel_order_", "")
            
            # Получаем заказ
            doc = await db.orders.find_one({"_id": as_object_id(order_id)})
            if not doc:
                await _answer_callback_query(
                    callback_query.get("id"),
                    "Заказ не найден",
                    show_alert=True
                )
                return {"ok": True}
            
            # Проверяем, что заказ можно отменить (новый или в обработке)
            current_status = doc.get("status")
            if current_status in {OrderStatus.SHIPPED.value, OrderStatus.DONE.value, OrderStatus.CANCELED.value}:
                await _answer_callback_query(
                    callback_query.get("id"),
                    f"Заказ нельзя отменить. Текущий статус: {current_status}",
                    show_alert=True
                )
                return {"ok": True}
            
            # Обновляем статус на "отменён" и возвращаем товары на склад
            from datetime import datetime
            from ..utils import restore_variant_quantity
            
            items = doc.get("items", [])
            for item in items:
                if item.get("variant_id"):
                    await restore_variant_quantity(
                        db,
                        item.get("product_id"),
                        item.get("variant_id"),
                        item.get("quantity", 0)
                    )
            
            updated = await db.orders.find_one_and_update(
                {"_id": as_object_id(order_id)},
                {
                    "$set": {
                        "status": OrderStatus.CANCELED.value,
                        "updated_at": datetime.utcnow(),
                        "can_edit_address": False,
                    }
                },
                return_document=True,
            )
            
            if updated:
                # Отвечаем на callback
                await _answer_callback_query(
                    callback_query.get("id"),
                    "❌ Заказ отменён!",
                    show_alert=False
                )
                
                # Обновляем сообщение, убирая кнопки
                await _edit_message_reply_markup(
                    settings.telegram_bot_token,
                    chat_id,
                    message_id,
                    None  # Убираем кнопки
                )
                
                # Отправляем уведомление клиенту об изменении статуса
                customer_user_id = updated.get("user_id")
                if customer_user_id:
                    try:
                        await notify_customer_order_status(
                            user_id=customer_user_id,
                            order_id=order_id,
                            order_status=OrderStatus.CANCELED.value,
                            customer_name=updated.get("customer_name"),
                        )
                    except Exception as e:
                        logger.error(f"Ошибка при отправке уведомления клиенту о статусе заказа {order_id}: {e}")
                
                logger.info(f"Заказ {order_id} отменён администратором {user_id} через кнопку")
            else:
                await _answer_callback_query(
                    callback_query.get("id"),
                    "Ошибка при обновлении заказа",
                    show_alert=True
                )
        
        return {"ok": True}
    except Exception as e:
        logger.error(f"Ошибка при обработке webhook: {e}")
        return {"ok": True}


async def _answer_callback_query(
    callback_query_id: str,
    text: str,
    show_alert: bool = False
):
    """Отвечает на callback query от Telegram."""
    settings = get_settings()
    if not settings.telegram_bot_token:
        return
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/answerCallbackQuery",
                json={
                    "callback_query_id": callback_query_id,
                    "text": text,
                    "show_alert": show_alert,
                }
            )
    except Exception as e:
        logger.error(f"Ошибка при ответе на callback query: {e}")


async def _edit_message_reply_markup(
    bot_token: str,
    chat_id: int,
    message_id: int,
    reply_markup: dict | None
):
    """Обновляет reply_markup сообщения."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            data = {
                "chat_id": chat_id,
                "message_id": message_id,
            }
            if reply_markup is None:
                data["reply_markup"] = "{}"
            else:
                import json
                data["reply_markup"] = json.dumps(reply_markup)
            
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/editMessageReplyMarkup",
                json=data
            )
    except Exception as e:
        logger.error(f"Ошибка при обновлении сообщения: {e}")

