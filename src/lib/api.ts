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
} from '@/types/api';
import { getUserId } from '@/lib/telegram';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private addAdminAuth(endpoint: string): string {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Не удалось определить пользователя');
    }
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}user_id=${userId}`;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[API] Request:', url, options?.method || 'GET');
    
    let timeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();
    
    try {
      // Добавляем таймаут для запросов
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 секунд таймаут
      
      const isFormData =
        typeof FormData !== 'undefined' && options?.body instanceof FormData;
      const headers = new Headers(options?.headers as HeadersInit);
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

      console.log('[API] Response:', response.status, response.statusText, url);

      // Обработка ответа 204 No Content (нет тела ответа)
      if (response.status === 204) {
        return undefined as T;
      }

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        if (isJson) {
          const error = payload as Partial<ApiError> & { detail?: string };
          const errorMessage =
            error.message ||
            error.detail ||
            error.error ||
            (typeof payload === 'string' ? payload : undefined) ||
            `API request failed: ${response.status} ${response.statusText}`;
          throw new Error(errorMessage);
        }
        throw new Error(
          'API request failed: сервер вернул не-JSON ответ. Проверьте адрес API или запущен ли бэкенд.'
        );
      }

      if (!isJson) {
        throw new Error(
          'API вернул некорректный ответ (не JSON). Убедитесь, что переменная VITE_API_URL указывает на API.'
        );
      }

      return payload as T;
    } catch (error) {
      // Очищаем таймаут в случае ошибки
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.error('API Error:', error);
      
      // Обработка прерванных запросов (таймаут или отмена)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Превышено время ожидания ответа от сервера. Проверьте, что бэкенд запущен на http://localhost:8000 и отвечает на запросы.');
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

  async getCart(userId: number): Promise<Cart> {
    return this.request<Cart>(`/cart?user_id=${userId}`);
  }

  async addToCart(data: {
    user_id: number;
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
    user_id: number;
    item_id: string;
    quantity: number;
  }): Promise<Cart> {
    return this.request<Cart>('/cart/item', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async removeFromCart(data: {
    user_id: number;
    item_id: string;
  }): Promise<Cart> {
    return this.request<Cart>('/cart/item', {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  async createOrder(data: CreateOrderRequest): Promise<Order> {
    const formData = new FormData();
    formData.append('user_id', data.user_id.toString());
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

  async getLastOrder(userId: number): Promise<Order | null> {
    try {
      return await this.request<Order>(`/order/last?user_id=${userId}`);
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

  // ADMIN API

  async getOrders(params?: {
    status?: string;
    limit?: number;
  }): Promise<Order[]> {
    const queryParams = new URLSearchParams();
    const userId = getUserId();
    if (userId) queryParams.append('user_id', userId.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request<Order[]>(`/admin/orders?${query}`);
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.request<Order>(this.addAdminAuth(`/admin/order/${orderId}`));
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

  async getAdminCatalog(): Promise<CatalogResponse> {
    return this.request<CatalogResponse>(this.addAdminAuth('/admin/catalog'));
  }

  async createProduct(data: ProductPayload): Promise<Product> {
    return this.request<Product>(this.addAdminAuth('/admin/product'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(
    productId: string,
    data: Partial<ProductPayload>
  ): Promise<Product> {
    return this.request<Product>(this.addAdminAuth(`/admin/product/${productId}`), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.request(this.addAdminAuth(`/admin/product/${productId}`), {
      method: 'DELETE',
    });
  }

  async createCategory(data: CategoryPayload): Promise<Category> {
    return this.request<Category>(this.addAdminAuth('/admin/category'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(
    categoryId: string,
    data: Partial<CategoryPayload>
  ): Promise<Category> {
    return this.request<Category>(this.addAdminAuth(`/admin/category/${categoryId}`), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(categoryId: string) {
    await this.request(this.addAdminAuth(`/admin/category/${categoryId}`), {
      method: 'DELETE',
    });
  }

  async sendBroadcast(data: BroadcastRequest): Promise<BroadcastResponse> {
    return this.request<BroadcastResponse>(this.addAdminAuth('/admin/broadcast'), {
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
    return this.request<StoreStatus>(this.addAdminAuth('/admin/store/sleep'), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
