from fastapi import Depends, HTTPException, status

from .config import get_settings
from .security import TelegramUser, get_current_user


async def verify_admin(current_user: TelegramUser = Depends(get_current_user)) -> int:
  """
  Dependency для проверки прав администратора.
  Простая проверка: если user_id есть в ADMIN_IDS - доступ разрешен.
  """
  import logging
  logger = logging.getLogger(__name__)
  
  settings = get_settings()
  user_id = int(current_user.id)
  
  logger.info(f"[verify_admin] Проверка для user_id={user_id}, ADMIN_IDS={settings.admin_ids}")
  
  # Проверяем, что ADMIN_IDS настроен
  if not settings.admin_ids or len(settings.admin_ids) == 0:
    logger.error("[verify_admin] ADMIN_IDS не настроен!")
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="ADMIN_IDS не настроен. Обратитесь к администратору.",
    )

  # Приводим все к int для корректного сравнения
  allowed_ids = {int(uid) for uid in settings.admin_ids}
  
  logger.info(f"[verify_admin] Разрешенные ID: {allowed_ids}, проверяемый user_id: {user_id}, совпадение: {user_id in allowed_ids}")
  
  # Простая проверка: есть ли user_id в списке администраторов
  if user_id in allowed_ids:
    logger.info(f"[verify_admin] Доступ разрешен для user_id={user_id}")
    return current_user.id

  logger.warning(f"[verify_admin] Доступ запрещен для user_id={user_id}, разрешенные ID: {allowed_ids}")
  raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail=f"Доступ запрещён. Требуются права администратора. Ваш ID: {user_id}, разрешенные ID: {sorted(list(allowed_ids))}",
  )

