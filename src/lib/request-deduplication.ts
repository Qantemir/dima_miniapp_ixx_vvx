/**
 * Request Deduplication - предотвращает дублирующие запросы
 * Если несколько компонентов запрашивают одни и те же данные одновременно,
 * выполняется только один запрос, остальные получают тот же Promise
 */

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

const pendingRequests = new Map<string, PendingRequest<unknown>>();
const REQUEST_TIMEOUT = 5000; // 5 секунд - максимальное время жизни запроса

export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  
  // Очищаем устаревшие запросы
  for (const [k, req] of pendingRequests.entries()) {
    if (now - req.timestamp > REQUEST_TIMEOUT) {
      pendingRequests.delete(k);
    }
  }
  
  // Проверяем, есть ли уже активный запрос
  const existing = pendingRequests.get(key);
  if (existing && now - existing.timestamp < REQUEST_TIMEOUT) {
    return existing.promise as Promise<T>;
  }
  
  // Создаем новый запрос
  const promise = requestFn().finally(() => {
    // Удаляем после завершения
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, {
    promise,
    timestamp: now,
  });
  
  return promise;
}

/**
 * Создает ключ для дедупликации на основе query key
 */
export function createDedupKey(parts: readonly unknown[]): string {
  return JSON.stringify(parts);
}

