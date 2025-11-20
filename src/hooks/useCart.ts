import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Cart } from '@/types/api';

export const CART_QUERY_KEY = ['cart'];

export const useCart = (enabled = true) => {
  return useQuery<Cart>({
    queryKey: CART_QUERY_KEY,
    queryFn: () => api.getCart(),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
};

