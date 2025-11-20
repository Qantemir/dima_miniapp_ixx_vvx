from fastapi import Depends, HTTPException, status

from .config import get_settings
from .security import TelegramUser, get_current_user


async def verify_admin(current_user: TelegramUser = Depends(get_current_user)) -> int:
  """
  Dependency для проверки прав администратора.
  Проверяет, что user_id находится в списке ADMIN_IDS.
  """
  settings = get_settings()
  if not settings.admin_ids:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Админские ID не настроены. Обратитесь к администратору.",
    )

  if current_user.id not in settings.admin_ids:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="Доступ запрещён. Требуются права администратора.",
    )

  return current_user.id

