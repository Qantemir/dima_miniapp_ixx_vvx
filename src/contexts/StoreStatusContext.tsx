import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { StoreStatus } from '@/types/api';
import { api } from '@/lib/api';

type StoreStatusContextValue = {
  status: StoreStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const StoreStatusContext = createContext<StoreStatusContextValue | undefined>(undefined);

export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getStoreStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load store status', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      loading,
      refresh,
    }),
    [status, loading, refresh],
  );

  return <StoreStatusContext.Provider value={value}>{children}</StoreStatusContext.Provider>;
}

export function useStoreStatus() {
  const ctx = useContext(StoreStatusContext);
  if (!ctx) throw new Error('useStoreStatus must be used within StoreStatusProvider');
  return ctx;
}

