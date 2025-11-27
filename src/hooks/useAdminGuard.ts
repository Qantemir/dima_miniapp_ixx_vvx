import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId, isAdmin, showBackButton, hideBackButton } from '@/lib/telegram';
import { ADMIN_IDS } from '@/types/api';
import { toast } from '@/lib/toast';

/**
 * Централизованная проверка прав администратора.
 * Показывает/прячет телеграм-кнопку «Назад» и перенаправляет неавторизованных.
 */
export const useAdminGuard = (backPath: string = '/') => {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const notifiedRef = useRef(false);

  useEffect(() => {
    const userId = getUserId();
    const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;

    if (!isUserAdmin) {
      if (!notifiedRef.current) {
        toast.error('Доступ запрещён. Требуются права администратора.');
        notifiedRef.current = true;
      }
      navigate('/');
      return;
    }

    setAuthorized(true);
  }, [navigate]);

  useEffect(() => {
    if (!authorized) return;
    showBackButton(() => navigate(backPath));
    return () => {
      hideBackButton();
    };
  }, [authorized, backPath, navigate]);

  return authorized;
};
