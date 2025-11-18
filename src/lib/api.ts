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
import {
  mockCatalogApi,
  shouldUseMockCatalog,
} from '@/lib/mockCatalog';

const USE_MOCK_CATALOG =
  (import.meta.env.VITE_USE_MOCK_CATALOG ?? 'true').toLowerCase() === 'true';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private shouldUseMock(error?: unknown) {
    return USE_MOCK_CATALOG || shouldUseMockCatalog(error);
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        if (isJson) {
          const error = payload as ApiError;
          throw new Error(error.message || error.error || 'API request failed');
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
      console.error('API Error:', error);
      throw error;
    }
  }

  // CLIENT API

  async getCatalog(): Promise<CatalogResponse> {
    if (USE_MOCK_CATALOG) {
      return mockCatalogApi.getCatalog();
    }
    try {
      return await this.request<CatalogResponse>('/catalog');
    } catch (error) {
      if (this.shouldUseMock(error)) {
        console.warn('Falling back to mock catalog (getCatalog)');
        return mockCatalogApi.getCatalog();
      }
      throw error;
    }
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
    if (USE_MOCK_CATALOG) {
      return mockCatalogApi.getCatalog();
    }
    try {
      return await this.request<CatalogResponse>('/admin/catalog');
    } catch (error) {
      if (this.shouldUseMock(error)) {
        console.warn('Falling back to mock catalog (getAdminCatalog)');
        return mockCatalogApi.getCatalog();
      }
      throw error;
    }
  }

  async createProduct(data: ProductPayload): Promise<Product> {
    if (USE_MOCK_CATALOG) {
      return mockCatalogApi.createProduct(data);
    }
    try {
      return await this.request<Product>('/admin/product', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (this.shouldUseMock(error)) {
        console.warn('Falling back to mock catalog (createProduct)');
        return mockCatalogApi.createProduct(data);
      }
      throw error;
    }
  }

  async updateProduct(
    productId: string,
    data: Partial<ProductPayload>
  ): Promise<Product> {
    if (USE_MOCK_CATALOG) {
      return mockCatalogApi.updateProduct(productId, data);
    }
    try {
      return await this.request<Product>(`/admin/product/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (this.shouldUseMock(error)) {
        console.warn('Falling back to mock catalog (updateProduct)');
        return mockCatalogApi.updateProduct(productId, data);
      }
      throw error;
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    if (USE_MOCK_CATALOG) {
      mockCatalogApi.deleteProduct(productId);
      return;
    }
    try {
      await this.request(`/admin/product/${productId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      if (this.shouldUseMock(error)) {
        console.warn('Falling back to mock catalog (deleteProduct)');
        mockCatalogApi.deleteProduct(productId);
        return;
      }
      throw error;
    }
  }

  async createCategory(data: CategoryPayload): Promise<Category> {
    if (USE_MOCK_CATALOG) {
      return mockCatalogApi.createCategory(data);
    }
    try {
      return await this.request<Category>(`/admin/category`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (this.shouldUseMock(error)) {
        console.warn('Falling back to mock catalog (createCategory)');
        return mockCatalogApi.createCategory(data);
      }
      throw error;
    }
  }

  async updateCategory(
    categoryId: string,
    data: Partial<CategoryPayload>
  ): Promise<Category> {
    if (USE_MOCK_CATALOG) {
      return mockCatalogApi.updateCategory(categoryId, data);
    }
    try {
      return await this.request<Category>(`/admin/category/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (this.shouldUseMock(error)) {
        console.warn('Falling back to mock catalog (updateCategory)');
        return mockCatalogApi.updateCategory(categoryId, data);
      }
      throw error;
    }
  }

  async deleteCategory(categoryId: string) {
    if (USE_MOCK_CATALOG) {
      mockCatalogApi.deleteCategory(categoryId);
      return;
    }
    try {
      await this.request(`/admin/category/${categoryId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      if (this.shouldUseMock(error)) {
        console.warn('Falling back to mock catalog (deleteCategory)');
        mockCatalogApi.deleteCategory(categoryId);
        return;
      }
      throw error;
    }
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
