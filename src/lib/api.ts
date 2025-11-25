// API client для работы с Python бэкендом

import {
  API_BASE_URL,
  type CatalogResponse,
  type Cart,
  type Order,
  type Product,
  type Category,
  type CreateOrderRequest,
  type UpdateAddressRequest,
  type UpdateStatusRequest,
  type ProductPayload,
  type CategoryPayload,
  type BroadcastRequest,
  type BroadcastResponse,
  type StoreStatus,
  type UpdateStoreStatusRequest,
  type ApiError,
  type AdminCategoryDetail,
} from '@/types/api';
import { getRequestAuthHeaders } from '@/lib/telegram';

class ApiClient {
  private baseUrl: string;
  private etagCache = new Map<string, string>();
  private responseCache = new Map<string, unknown>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getCacheKey(method: string, endpoint: string) {
    return `${method.toUpperCase()} ${endpoint}`;
  }

  private cacheResponse(method: string, endpoint: string, payload: unknown, etag?: string | null) {
    const cacheKey = this.getCacheKey(method, endpoint);
    if (etag) {
      this.etagCache.set(cacheKey, etag);
    }
    this.responseCache.set(cacheKey, payload);
  }

  private getCachedResponse<T>(method: string, endpoint: string): T | null {
    const cacheKey = this.getCacheKey(method, endpoint);
    const cached = this.responseCache.get(cacheKey);
    return (cached as T) ?? null;
  }

  private getEtag(method: string, endpoint: string): string | undefined {
    const cacheKey = this.getCacheKey(method, endpoint);
    return this.etagCache.get(cacheKey);
  }

  private invalidateCache(endpoint: string) {
    const cacheKey = this.getCacheKey('GET', endpoint);
    this.etagCache.delete(cacheKey);
    this.responseCache.delete(cacheKey);
  }

  private invalidateCatalogCaches() {
    this.invalidateCache('/catalog');
    this.invalidateCache('/admin/catalog');
  }

  private buildHeaders(existing?: HeadersInit): Headers {
    const headers = new Headers(existing);
    const authHeaders = getRequestAuthHeaders();
    Object.entries(authHeaders).forEach(([key, value]) => {
      if (value) {
        headers.set(key, value);
      }
    });
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    // Формируем абсолютный URL, чтобы избежать проблем с базовым путем /app
    let url: string;
    if (this.baseUrl.startsWith('http://') || this.baseUrl.startsWith('https://')) {
      // Абсолютный URL - используем как есть, убираем /app если есть
      const base = this.baseUrl.replace(/\/app\/api/, '/api');
      url = `${base}${endpoint}`;
    } else {
      // Относительный URL - используем как есть (для локальной разработки)
      url = `${this.baseUrl}${endpoint}`;
    }
    const method = (options?.method || 'GET').toUpperCase();
    
    let timeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();
    
    try {
      // Добавляем таймаут для запросов
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 секунд таймаут
      
      const isFormData =
        typeof FormData !== 'undefined' && options?.body instanceof FormData;
      const headers = this.buildHeaders(options?.headers as HeadersInit);
      if (method === 'GET') {
        const etag = this.getEtag(method, endpoint);
        if (etag) {
          headers.set('If-None-Match', etag);
        }
      }
      if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(url, {
        ...(options || {}),
        signal: controller.signal,
        headers,
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Обработка 304 Not Modified - просто делаем повторный запрос
      if (response.status === 304) {
        const cached = this.getCachedResponse<T>(method, endpoint);
        if (cached) {
          return cached;
        }
        // Если кэша нет, повторяем запрос без ETag
        const freshHeaders = this.buildHeaders(options?.headers as HeadersInit);
        freshHeaders.delete('If-None-Match');
        const freshResponse = await fetch(url, {
          ...(options || {}),
          headers: freshHeaders,
        });
        if (!freshResponse.ok) {
          throw new Error(`API request failed: ${freshResponse.status} ${freshResponse.statusText}`);
        }
        const freshContentType = freshResponse.headers.get('content-type') || '';
        const freshIsJson = freshContentType.includes('application/json');
        const freshPayload = freshIsJson ? await freshResponse.json() : await freshResponse.text();
        if (freshIsJson) {
          const freshEtag = freshResponse.headers.get('etag');
          this.cacheResponse(method, endpoint, freshPayload, freshEtag);
        }
        return freshPayload as T;
      }

      // Обработка ответа 204 No Content (нет тела ответа)
      if (response.status === 204) {
        if (method === 'GET') {
          this.invalidateCache(endpoint);
        }
        return undefined as T;
      }

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      
      let payload: unknown;
      try {
        payload = isJson ? await response.json() : await response.text();
      } catch (parseError) {
        throw new Error(`Failed to parse API response: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        if (isJson && payload) {
          const error = payload as Partial<ApiError> & { detail?: string; message?: string };
          errorMessage = error.detail || error.message || error.error || JSON.stringify(payload) || errorMessage;
        } else if (typeof payload === 'string') {
          errorMessage = payload;
        }
        throw new Error(errorMessage);
      }

      if (!isJson) {
        throw new Error(
          'API вернул некорректный ответ (не JSON). Убедитесь, что переменная VITE_API_URL указывает на API.'
        );
      }

      if (method === 'GET' && isJson) {
        const etag = response.headers.get('etag');
        this.cacheResponse(method, endpoint, payload, etag);
      } else if (method !== 'GET') {
        this.invalidateCache(endpoint);
      }

      return payload as T;
    } catch (error) {
      // Обработка прерванных запросов (отмена React Query или таймаут)
      if (error instanceof Error && error.name === 'AbortError') {
        // Если таймаут ещё активен, значит это был таймаут, а не отмена запроса
        const wasTimeout = timeoutId !== null;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Игнорируем отмену запросов (React Query может отменять при размонтировании)
        // Показываем ошибку только если это был таймаут
        if (wasTimeout) {
          throw new Error('Превышено время ожидания ответа от сервера. Проверьте, что бэкенд запущен и отвечает на запросы.');
        }
        // Для отмененных запросов просто пробрасываем AbortError, React Query его обработает
        // Не логируем, так как это нормальное поведение
        throw error;
      }
      
      // Очищаем таймаут в случае других ошибок
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Обработка ошибок сети
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на http://localhost:8000');
        }
      }
      
      throw error;
    }
  }

  // CLIENT API

  async getCatalog(): Promise<CatalogResponse> {
    return this.request<CatalogResponse>('/catalog');
  }

  async getCart(): Promise<Cart> {
    return this.request<Cart>('/cart');
  }

  async addToCart(data: {
    product_id: string;
    variant_id?: string;
    quantity: number;
  }): Promise<Cart> {
    return this.request<Cart>('/cart', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCartItem(data: {
    item_id: string;
    quantity: number;
  }): Promise<Cart> {
    return this.request<Cart>('/cart/item', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async removeFromCart(data: {
    item_id: string;
  }): Promise<Cart> {
    return this.request<Cart>('/cart/item', {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  async createOrder(data: CreateOrderRequest): Promise<Order> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('phone', data.phone);
    formData.append('address', data.address);
    if (data.comment) {
      formData.append('comment', data.comment);
    }
    if (data.delivery_type) {
      formData.append('delivery_type', data.delivery_type);
    }
    if (data.payment_type) {
      formData.append('payment_type', data.payment_type);
    }
    formData.append('payment_receipt', data.payment_receipt);

    return this.request<Order>('/order', {
      method: 'POST',
      body: formData,
    });
  }

  async getLastOrder(): Promise<Order | null> {
    try {
      return await this.request<Order>('/order/last');
    } catch (error) {
      // If no active order, return null
      return null;
    }
  }

  async updateOrderAddress(
    orderId: string,
    data: UpdateAddressRequest
  ): Promise<Order> {
    return this.request<Order>(`/order/${orderId}/address`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.request<Order>(`/order/${orderId}`);
  }

  // ADMIN API

  async getOrders(params?: {
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<AdminOrdersResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    
    const query = queryParams.toString();
    return this.request<AdminOrdersResponse>(`/admin/orders?${query}`);
  }

  async getAdminOrder(orderId: string): Promise<Order> {
    return this.request<Order>(`/admin/order/${orderId}`);
  }

  async updateOrderStatus(
    orderId: string,
    data: UpdateStatusRequest
  ): Promise<Order> {
    return this.request<Order>(`/admin/order/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async restoreOrder(orderId: string): Promise<Order> {
    return this.request<Order>(`/admin/order/${orderId}/restore`, {
      method: 'POST',
    });
  }

  async getAdminCatalog(): Promise<CatalogResponse> {
    return this.request<CatalogResponse>('/admin/catalog');
  }

  async getAdminCategory(categoryId: string): Promise<AdminCategoryDetail> {
    return this.request<AdminCategoryDetail>(`/admin/category/${categoryId}`);
  }

  async createProduct(data: ProductPayload): Promise<Product> {
    const result = await this.request<Product>('/admin/product', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.invalidateCatalogCaches();
    return result;
  }

  async updateProduct(
    productId: string,
    data: Partial<ProductPayload>
  ): Promise<Product> {
    const result = await this.request<Product>(`/admin/product/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    this.invalidateCatalogCaches();
    return result;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.request(`/admin/product/${productId}`, {
      method: 'DELETE',
    });
    this.invalidateCatalogCaches();
  }

  async createCategory(data: CategoryPayload): Promise<Category> {
    const result = await this.request<Category>('/admin/category', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.invalidateCatalogCaches();
    return result;
  }

  async updateCategory(
    categoryId: string,
    data: Partial<CategoryPayload>
  ): Promise<Category> {
    const result = await this.request<Category>(`/admin/category/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    this.invalidateCatalogCaches();
    return result;
  }

  async deleteCategory(categoryId: string) {
    await this.request(`/admin/category/${categoryId}`, {
      method: 'DELETE',
    });
    this.invalidateCatalogCaches();
  }

  async sendBroadcast(data: BroadcastRequest): Promise<BroadcastResponse> {
    return this.request<BroadcastResponse>('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStoreStatus(): Promise<StoreStatus> {
    return this.request<StoreStatus>('/store/status');
  }

  async setStoreSleepMode(
    data: UpdateStoreStatusRequest
  ): Promise<StoreStatus> {
    return this.request<StoreStatus>('/admin/store/sleep', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
