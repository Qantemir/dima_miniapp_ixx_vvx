import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/react-query';
import type { Cart } from '@/types/api';

export const CART_QUERY_KEY = queryKeys.cart;

/**
 * Хук для получения корзины
 * 
 * Оптимизирован для производительности:
 * - staleTime: 1 минута (корзина может меняться чаще)
 * - Использует глобальные настройки retry
 */
export const useCart = (enabled = true) => {
  return useQuery<Cart>({
    queryKey: CART_QUERY_KEY,
    queryFn: () => api.getCart(),
    enabled,
    staleTime: 60_000, // 1 минута для корзины (может меняться чаще)
    gcTime: 10 * 60 * 1000, // 10 минут кэш
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

