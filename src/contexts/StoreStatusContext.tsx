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

  // Начальная загрузка статуса
  useEffect(() => {
    const loadInitialStatus = async () => {
      try {
        const initial = await api.getStoreStatus();
        setStatus(initial);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    loadInitialStatus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const buildStreamUrl = () => {
      // Убираем /app из пути если есть
      let base = API_BASE_URL.endsWith('/')
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;
      base = base.replace(/\/app\/api/, '/api');
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

      // Обработка события 'status'
      eventSource.addEventListener('status', (event: MessageEvent) => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data) as StoreStatus;
          setStatus(parsed);
          setLoading(false);
        } catch (err) {
          // Ignore parsing errors
        }
      });

      // Fallback на onmessage для совместимости
      eventSource.onmessage = event => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data) as StoreStatus;
          setStatus(parsed);
          setLoading(false);
        } catch (err) {
          // Ignore parsing errors
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

  // Периодический опрос как fallback, если SSE недоступен (например, Telegram WebView убивает соединение)
  useEffect(() => {
    const interval = setInterval(() => {
      refresh().catch(() => {
        // Игнорируем ошибки, очередная попытка выполнится через интервал
      });
    }, 30_000); // каждые 30 секунд

    return () => {
      clearInterval(interval);
    };
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

