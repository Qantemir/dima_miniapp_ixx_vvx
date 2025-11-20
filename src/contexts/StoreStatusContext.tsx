import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { StoreStatus } from '@/types/api';
import { api } from '@/lib/api';
import { API_BASE_URL } from '@/types/api';

type StoreStatusContextValue = {
  status: StoreStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const StoreStatusContext = createContext<StoreStatusContextValue | undefined>(undefined);

export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const buildStreamUrl = () => {
      const base = API_BASE_URL.endsWith('/')
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;
      const path = `${base}/store/status/stream`;
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }
      if (path.startsWith('/')) {
        return path;
      }
      return `/${path}`;
    };

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const url = buildStreamUrl();
      eventSource = new EventSource(url);

      eventSource.onmessage = event => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data) as StoreStatus;
          setStatus(parsed);
          setLoading(false);
        } catch (err) {
          console.error('Failed to parse store status event', err);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const latest = await api.getStoreStatus();
      setStatus(latest);
    } finally {
      setLoading(false);
    }
  }, []);

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

