from fastapi import HTTPException, Query, status
from .config import get_settings


async def verify_admin(user_id: int = Query(..., description="Telegram user ID")):
  """
  Dependency для проверки прав администратора.
  Проверяет, что user_id находится в списке ADMIN_IDS.
  """
  settings = get_settings()
  if not settings.admin_ids:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Админские ID не настроены. Обратитесь к администратору."
    )
  
  if user_id not in settings.admin_ids:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="Доступ запрещён. Требуются права администратора."
    )
  
  return user_id

