/**
 * Контекст для статуса магазина
 * 
 * Теперь использует оптимизированный сервис с React Query
 * для лучшей производительности и кэширования
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useStoreStatus as useStoreStatusService } from '@/services/store-status';
import type { StoreStatus } from '@/types/api';

type StoreStatusContextValue = {
  status: StoreStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const StoreStatusContext = createContext<StoreStatusContextValue | undefined>(undefined);

/**
 * Провайдер для статуса магазина
 * Использует оптимизированный сервис с React Query
 */
export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const storeStatus = useStoreStatusService();

  return (
    <StoreStatusContext.Provider value={storeStatus}>
      {children}
    </StoreStatusContext.Provider>
  );
}

/**
 * Хук для использования статуса магазина
 * 
 * @deprecated Используйте напрямую useStoreStatus из @/services/store-status
 * Оставлен для обратной совместимости
 */
export function useStoreStatus() {
  const ctx = useContext(StoreStatusContext);
  if (!ctx) throw new Error('useStoreStatus must be used within StoreStatusProvider');
  return ctx;
}

