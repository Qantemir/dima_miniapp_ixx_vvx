import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { StoreStatus } from '@/types/api';
import { api } from '@/lib/api';

type StoreStatusContextValue = {
  status: StoreStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const StoreStatusContext = createContext<StoreStatusContextValue | undefined>(undefined);

export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['store-status'],
    queryFn: () => api.getStoreStatus(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['store-status'] });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      status: data ?? null,
      loading: !data && (isLoading || isFetching),
      refresh,
    }),
    [data, isLoading, isFetching, refresh],
  );

  return <StoreStatusContext.Provider value={value}>{children}</StoreStatusContext.Provider>;
}

export function useStoreStatus() {
  const ctx = useContext(StoreStatusContext);
  if (!ctx) throw new Error('useStoreStatus must be used within StoreStatusProvider');
  return ctx;
}

