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
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
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
          const error = payload as ApiError;
          throw new Error(error.message || error.error || `API request failed: ${response.status} ${response.statusText}`);
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
    return this.request<Order>('/order', {
      method: 'POST',
      body: JSON.stringify(data),
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
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request<Order[]>(`/admin/orders${query ? `?${query}` : ''}`);
  }

  async getOrder(orderId: string): Promise<Order> {
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

  async getAdminCatalog(): Promise<CatalogResponse> {
    return this.request<CatalogResponse>('/admin/catalog');
  }

  async createProduct(data: ProductPayload): Promise<Product> {
    return this.request<Product>('/admin/product', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(
    productId: string,
    data: Partial<ProductPayload>
  ): Promise<Product> {
    return this.request<Product>(`/admin/product/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.request(`/admin/product/${productId}`, {
      method: 'DELETE',
    });
  }

  async createCategory(data: CategoryPayload): Promise<Category> {
    return this.request<Category>(`/admin/category`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(
    categoryId: string,
    data: Partial<CategoryPayload>
  ): Promise<Category> {
    return this.request<Category>(`/admin/category/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(categoryId: string) {
    await this.request(`/admin/category/${categoryId}`, {
      method: 'DELETE',
    });
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
