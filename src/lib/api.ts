// API client для работы с Python бэкендом

import {
  API_BASE_URL,
  type CatalogResponse,
  type Cart,
  type Order,
  type CreateOrderRequest,
  type UpdateAddressRequest,
  type UpdateStatusRequest,
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
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
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
}

export const api = new ApiClient(API_BASE_URL);
