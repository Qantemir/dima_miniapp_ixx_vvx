from fastapi import Depends, HTTPException, status

from .config import get_settings
from .security import TelegramUser, get_current_user


async def verify_admin(current_user: TelegramUser = Depends(get_current_user)) -> int:
  """
  Dependency для проверки прав администратора.
  Проверяет, что user_id находится в списке ADMIN_IDS.
  В режиме разработки (allow_dev_requests=True) разрешает доступ если ADMIN_IDS не настроен.
  """
  settings = get_settings()
  
  # В режиме разработки разрешаем доступ если admin_ids не настроен
  if settings.allow_dev_requests and not settings.admin_ids:
    return current_user.id
  
  # Если admin_ids не настроен и не в dev режиме, это ошибка конфигурации
  if not settings.admin_ids:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Админские ID не настроены. Обратитесь к администратору.",
    )

  # Проверяем, есть ли пользователь в списке администраторов
  # В dev режиме также проверяем dev_allowed_user_ids
  allowed_ids = set(settings.admin_ids)
  if settings.allow_dev_requests and settings.dev_allowed_user_ids:
    allowed_ids.update(settings.dev_allowed_user_ids)
  
  if current_user.id in allowed_ids:
    return current_user.id

  raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Доступ запрещён. Требуются права администратора.",
  )

