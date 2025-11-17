import type {
  CatalogResponse,
  Category,
  CategoryPayload,
  Product,
  ProductPayload,
} from '@/types/api';

const STORAGE_KEY = 'miniapp_catalog_store';

const DEFAULT_STORE: CatalogResponse = {
  categories: [
    { id: 'cat-1', name: 'Категория 1' },
    { id: 'cat-2', name: 'Категория 2' },
  ],
  products: [],
};

const isBrowser = typeof window !== 'undefined';

const loadStore = (): CatalogResponse => {
  if (!isBrowser) {
    return structuredClone(DEFAULT_STORE);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as CatalogResponse;
    }
  } catch {
    // ignore
  }
  saveStore(DEFAULT_STORE);
  return structuredClone(DEFAULT_STORE);
};

const saveStore = (store: CatalogResponse) => {
  if (!isBrowser) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const cloneStore = (store: CatalogResponse): CatalogResponse =>
  JSON.parse(JSON.stringify(store));

export const mockCatalogApi = {
  getCatalog(): CatalogResponse {
    return loadStore();
  },

  createCategory(data: CategoryPayload): Category {
    const store = loadStore();
    const category: Category = {
      id: generateId(),
      name: data.name,
    };
    store.categories.push(category);
    saveStore(store);
    return category;
  },

  updateCategory(categoryId: string, data: Partial<CategoryPayload>): Category {
    const store = loadStore();
    const index = store.categories.findIndex(category => category.id === categoryId);
    if (index === -1) {
      throw new Error('Категория не найдена');
    }
    store.categories[index] = {
      ...store.categories[index],
      ...data,
    };
    saveStore(store);
    return store.categories[index];
  },

  deleteCategory(categoryId: string) {
    const store = loadStore();
    store.categories = store.categories.filter(category => category.id !== categoryId);
    store.products = store.products.filter(product => product.category_id !== categoryId);
    saveStore(store);
  },

  createProduct(data: ProductPayload): Product {
    const store = loadStore();
    const images = data.images && data.images.length > 0 ? data.images : data.image ? [data.image] : [];
    const product: Product = {
      id: generateId(),
      ...data,
      image: images[0] || data.image,
      images,
    };
    store.products.push(product);
    saveStore(store);
    return product;
  },

  updateProduct(productId: string, data: Partial<ProductPayload>): Product {
    const store = loadStore();
    const index = store.products.findIndex(product => product.id === productId);
    if (index === -1) {
      throw new Error('Товар не найден');
    }
    const nextImages =
      (data.images && data.images.length > 0 ? data.images : undefined) ??
      (data.image ? [data.image] : store.products[index].images);

    store.products[index] = {
      ...store.products[index],
      ...data,
      image: nextImages ? nextImages[0] : store.products[index].image,
      images: nextImages,
    };
    saveStore(store);
    return store.products[index];
  },

  deleteProduct(productId: string) {
    const store = loadStore();
    store.products = store.products.filter(product => product.id !== productId);
    saveStore(store);
  },
};

export const shouldUseMockCatalog = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message || '';
  return (
    message.includes('не-JSON') ||
    message.includes('не JSON') ||
    message.includes('404') ||
    message.includes('Failed to fetch') ||
    message.includes('API request failed')
  );
};

