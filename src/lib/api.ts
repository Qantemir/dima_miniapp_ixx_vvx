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
  type UpdatePaymentLinkRequest,
  type ApiError,
  type AdminCategoryDetail,
  type AdminOrdersResponse,
} from '@/types/api';
import { getRequestAuthHeaders } from '@/lib/telegram';
import { deduplicateRequest, createDedupKey } from './request-deduplication';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Метод оставлен для совместимости вызовов инвалидации (ручного кэша нет).
  private invalidateCatalogCaches() {
    return;
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
      const base = this.baseUrl.replace(/\/app\/api/, '/api');
      url = `${base}${endpoint}`;
    } else {
      url = `${this.baseUrl}${endpoint}`;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();

    try {
      // Адаптивный timeout: для больших запросов (каталог) больше времени
      const isLargeRequest = endpoint.includes('/catalog') || endpoint.includes('/admin/orders');
      const timeout = isLargeRequest ? 15_000 : 10_000;
      timeoutId = setTimeout(() => controller.abort(), timeout);

      const isFormData =
        typeof FormData !== 'undefined' && options?.body instanceof FormData;
      const headers = this.buildHeaders(options?.headers as HeadersInit);
      
      // Для FormData НЕ устанавливаем Content-Type - браузер сделает это сам с правильным boundary
      // Для JSON запросов устанавливаем Content-Type
      if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      
      // Для FormData удаляем Content-Type, если он был установлен вручную
      // Браузер должен установить его автоматически с boundary
      if (isFormData) {
        headers.delete('Content-Type');
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

      if (response.status === 204) {
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

        if (response.status === 401) {
          const lowerMessage = errorMessage.toLowerCase();
          if (lowerMessage.includes('telegram') || lowerMessage.includes('устарел') || 
              lowerMessage.includes('неверные данные') || lowerMessage.includes('недействительная подпись') ||
              lowerMessage.includes('отсутствует') || lowerMessage.includes('не удалось получить')) {
            throw new Error('Неверные данные Telegram. Пожалуйста, обновите страницу и попробуйте снова.');
          }
          if (errorMessage.includes('обновите') || errorMessage.includes('перезапустите')) {
            throw new Error(errorMessage);
          }
          throw new Error(errorMessage || 'Ошибка аутентификации. Пожалуйста, обновите страницу.');
        }

        throw new Error(errorMessage);
      }

      if (!isJson) {
        throw new Error(
          'API вернул некорректный ответ (не JSON). Убедитесь, что переменная VITE_API_URL указывает на API.'
        );
      }

      return payload as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const wasTimeout = timeoutId !== null;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (wasTimeout) {
          throw new Error('Превышено время ожидания ответа от сервера. Проверьте, что бэкенд запущен и отвечает на запросы.');
        }
        throw error;
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Обработка сетевых ошибок (CORS, нет подключения и т.д.)
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          // Проверяем, не была ли это CORS ошибка
          const displayUrl = this.baseUrl;
          throw new Error(`Не удалось подключиться к серверу. Проверьте: 1) Бэкенд запущен и доступен по адресу ${displayUrl} 2) CORS настроен правильно на бэкенде`);
        }
      }

      // Если это уже обработанная ошибка, пробрасываем дальше
      if (error instanceof Error) {
        throw error;
      }

      // Для всех остальных ошибок
      throw error;
    }
  }

  // CLIENT API

  async getCatalog(): Promise<CatalogResponse> {
    const key = createDedupKey(['catalog']);
    return deduplicateRequest(key, () => this.request<CatalogResponse>('/catalog'));
  }

  async getCart(): Promise<Cart> {
    const key = createDedupKey(['cart']);
    return deduplicateRequest(key, () => this.request<Cart>('/cart'));
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
    includeDeleted?: boolean;
  }): Promise<AdminOrdersResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.includeDeleted) queryParams.append('include_deleted', 'true');
    
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

  async setPaymentLink(
    data: UpdatePaymentLinkRequest
  ): Promise<StoreStatus> {
    return this.request<StoreStatus>('/admin/store/payment-link', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);

