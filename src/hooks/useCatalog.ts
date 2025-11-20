import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CatalogResponse } from '@/types/api';

export const CATALOG_QUERY_KEY = ['catalog'];

export function useCatalog() {
  return useQuery<CatalogResponse>({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: () => api.getCatalog(),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

