// API Types для интеграции с Python бэкендом

export interface Category {
  id: string;
  name: string;
}

export interface CategoryPayload {
  name: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  available: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  variants?: ProductVariant[];
  price?: number;
  available: boolean;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  category_id: string;
  available: boolean;
}

export interface CatalogResponse {
  categories: Category[];
  products: Product[];
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Cart {
  user_id: number;
  items: CartItem[];
  total_amount: number;
}

export interface OrderItem {
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 
  | 'новый' 
  | 'в обработке' 
  | 'принят' 
  | 'выехал' 
  | 'завершён' 
  | 'отменён';

export interface Order {
  id: string;
  user_id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  comment?: string;
  delivery_type?: string;
  payment_type?: string;
  status: OrderStatus;
  items: OrderItem[];
  total_amount: number;
  created_at: string;
  updated_at?: string;
  can_edit_address: boolean;
}

export type BroadcastSegment = 'all' ;

export interface BroadcastRequest {
  title: string;
  message: string;
  segment: BroadcastSegment;
  link?: string;
}

export interface BroadcastResponse {
  success: boolean;
  sent_count: number;
  total_count: number;
  failed_count: number;
}

export interface StoreStatus {
  is_sleep_mode: boolean;
  sleep_message?: string;
  updated_at?: string;
}

export interface UpdateStoreStatusRequest {
  sleep: boolean;
  message?: string;
}

export interface CreateOrderRequest {
  user_id: number;
  name: string;
  phone: string;
  address: string;
  comment?: string;
  delivery_type?: string;
  payment_type?: string;
}

export interface UpdateAddressRequest {
  user_id: number;
  address: string;
}

export interface UpdateStatusRequest {
  user_id: number;
  status: OrderStatus;
}

export interface ApiError {
  error: string;
  message: string;
  status_code: number;
}

// API Client Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Admin user IDs (должен совпадать с config.py в Python боте)
export const ADMIN_IDS = (import.meta.env.VITE_ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
