/**
 * Сервис для работы со статусом магазина
 * Использует React Query для кэширования и оптимизации запросов
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/react-query';
import type { StoreStatus } from '@/types/api';
import { API_BASE_URL } from '@/types/api';
import { useEffect, useRef } from 'react';

/**
 * Хук для получения статуса магазина с поддержкой SSE
 * 
 * Оптимизирован для производительности:
 * - Использует React Query для кэширования
 * - SSE для real-time обновлений
 * - Fallback на polling только при необходимости
 */
export function useStoreStatus() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  // Используем React Query для кэширования и управления состоянием
  const {
    data: status,
    isLoading: loading,
    refetch: refresh,
  } = useQuery<StoreStatus>({
    queryKey: queryKeys.storeStatus,
    queryFn: () => api.getStoreStatus(),
    staleTime: 60 * 1000, // 1 минута для статуса
    gcTime: 5 * 60 * 1000,
    // Не обновлять автоматически - используем SSE
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Настройка SSE для real-time обновлений
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const buildStreamUrl = () => {
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

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        // Прекращаем попытки переподключения, используем только polling
        return;
      }

      const url = buildStreamUrl();
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('status', (event: MessageEvent) => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data) as StoreStatus;
          // Обновляем кэш React Query напрямую
          queryClient.setQueryData(queryKeys.storeStatus, parsed);
          reconnectAttempts = 0; // Сброс счетчика при успешном подключении
        } catch (err) {
          // Ignore parsing errors
        }
      });

      eventSource.onmessage = (event) => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data) as StoreStatus;
          queryClient.setQueryData(queryKeys.storeStatus, parsed);
          reconnectAttempts = 0;
        } catch (err) {
          // Ignore parsing errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        reconnectAttempts++;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        // Экспоненциальная задержка для переподключения
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 30000);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [queryClient]);

  // Fallback polling только если SSE не работает (увеличен интервал для экономии ресурсов)
  useEffect(() => {
    // Polling только если нет данных или прошло больше 2 минут с последнего обновления
    const interval = setInterval(() => {
      const queryData = queryClient.getQueryState(queryKeys.storeStatus);
      const lastUpdated = queryData?.dataUpdatedAt || 0;
      const timeSinceUpdate = Date.now() - lastUpdated;
      
      // Обновляем только если данные устарели (больше 2 минут)
      if (timeSinceUpdate > 2 * 60 * 1000) {
        refresh().catch(() => {
          // Игнорируем ошибки
        });
      }
    }, 60_000); // Проверяем каждую минуту (вместо 30 секунд)

    return () => {
      clearInterval(interval);
    };
  }, [queryClient, refresh]);

  return {
    status: status || null,
    loading,
    refresh: async () => {
      await refresh();
    },
  };
}

