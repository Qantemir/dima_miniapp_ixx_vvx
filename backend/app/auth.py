from fastapi import Depends, HTTPException, status

from .config import get_settings
from .security import TelegramUser, get_current_user


async def verify_admin(current_user: TelegramUser = Depends(get_current_user)) -> int:
  """
  Dependency для проверки прав администратора.
  Проверяет, что user_id находится в списке ADMIN_IDS.
  В режиме разработки (allow_dev_requests=True) разрешает доступ если ADMIN_IDS не настроен.
  """
  import logging
  logger = logging.getLogger(__name__)
  
  settings = get_settings()
  user_id = current_user.id
  
  # Проверяем, действительно ли admin_ids пустой (не настроен)
  admin_ids_empty = not settings.admin_ids or len(settings.admin_ids) == 0
  
  logger.info(f"Проверка прав администратора для user_id={user_id}, allow_dev_requests={settings.allow_dev_requests}, admin_ids={settings.admin_ids} (пустой: {admin_ids_empty}), dev_allowed_user_ids={settings.dev_allowed_user_ids}")
  
  # В режиме разработки разрешаем доступ если admin_ids не настроен
  if settings.allow_dev_requests and admin_ids_empty:
    logger.info(f"Разрешен доступ в dev режиме (admin_ids не настроен) для user_id={user_id}")
    return current_user.id
  
  # Если admin_ids не настроен и не в dev режиме, это ошибка конфигурации
  if admin_ids_empty:
    logger.error("Админские ID не настроены и не в dev режиме")
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Админские ID не настроены. Обратитесь к администратору.",
    )

  # Приводим все к int для корректного сравнения
  user_id_int = int(user_id) if user_id is not None else None
  
  # Собираем все разрешенные ID с приведением типов
  allowed_ids_int = {int(uid) for uid in settings.admin_ids}
  if settings.allow_dev_requests and settings.dev_allowed_user_ids:
    allowed_ids_int.update({int(uid) for uid in settings.dev_allowed_user_ids})
  
  logger.info(f"Разрешенные ID: {allowed_ids_int}, проверяемый user_id: {user_id_int} (тип: {type(user_id_int).__name__})")
  
  # В dev режиме, если пользователь в dev_allowed_user_ids, разрешаем доступ
  if settings.allow_dev_requests and settings.dev_allowed_user_ids:
    dev_allowed_int = {int(uid) for uid in settings.dev_allowed_user_ids}
    if user_id_int in dev_allowed_int:
      logger.info(f"Доступ разрешен в dev режиме через dev_allowed_user_ids для user_id={user_id_int}")
      return current_user.id
  
  # Проверяем основной список администраторов
  if user_id_int in allowed_ids_int:
    logger.info(f"Доступ разрешен для user_id={user_id_int}")
    return current_user.id

  logger.warning(f"Доступ запрещен для user_id={user_id_int}, разрешенные ID: {allowed_ids_int}")
  raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail=f"Доступ запрещён. Требуются права администратора. Ваш ID: {user_id_int}, разрешенные ID: {sorted(list(allowed_ids_int))}",
  )

