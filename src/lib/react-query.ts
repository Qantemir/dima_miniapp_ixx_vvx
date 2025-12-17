import { QueryClient } from '@tanstack/react-query';

/**
 * Оптимизированная конфигурация React Query
 * 
 * Настройки оптимизированы для производительности:
 * - Увеличен staleTime для уменьшения количества запросов
 * - Отключен refetchOnWindowFocus для снижения нагрузки
 * - Настроен gcTime для эффективного управления памятью
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Данные считаются свежими 2 минуты (вместо 30 секунд)
      staleTime: 2 * 60 * 1000,
      // Кэш хранится 10 минут (вместо 5)
      gcTime: 10 * 60 * 1000,
      // Не перезапрашивать при фокусе окна (экономит запросы)
      refetchOnWindowFocus: false,
      // Перезапрашивать при переподключении сети
      refetchOnReconnect: true,
      // Не перезапрашивать при монтировании, если данные свежие
      refetchOnMount: false,
      // Только 1 попытка повтора при ошибке
      retry: 1,
      // Задержка 1 секунда перед повтором
      retryDelay: 1000,
    },
    mutations: {
      // Повторять мутации только 1 раз при ошибке
      retry: 1,
      retryDelay: 1000,
    },
  },
});

/**
 * Query keys для централизованного управления
 */
export const queryKeys = {
  catalog: ['catalog'] as const,
  adminCatalog: ['admin-catalog'] as const,
  cart: ['cart'] as const,
  order: (orderId: string) => ['order', orderId] as const,
  adminOrder: (orderId: string) => ['admin-order', orderId] as const,
  adminOrders: (status?: string) => ['admin-orders', status] as const,
  adminCategory: (categoryId: string) => ['admin-category', categoryId] as const,
  storeStatus: ['store-status'] as const,
} as const;

