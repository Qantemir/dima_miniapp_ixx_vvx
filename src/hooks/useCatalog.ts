import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/react-query';
import type { CatalogResponse } from '@/types/api';

export const CATALOG_QUERY_KEY = queryKeys.catalog;

/**
 * Хук для получения каталога товаров
 * 
 * Оптимизирован для производительности:
 * - staleTime: 2 минуты (из глобальной конфигурации)
 * - refetchOnMount: false (использует кэш если данные свежие)
 * - refetchOnWindowFocus: false (экономит запросы)
 */
export function useCatalog() {
  return useQuery<CatalogResponse>({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: () => api.getCatalog(),
    // Увеличенный staleTime для каталога - данные меняются редко
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    gcTime: 10 * 60 * 1000, // 10 минут кэш (совпадает с глобальными настройками)
    // Не перезапрашивать автоматически
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

