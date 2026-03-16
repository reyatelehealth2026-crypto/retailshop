/**
 * Product API
 * API สำหรับจัดการสินค้า - เชื่อมต่อกับ Backend PHP จริง
 */

import { apiClient } from './client';
import type { 
  Product, 
  ProductFilter, 
  ProductListResponse, 
  ProductDetailResponse 
} from '@/types/product';

/**
 * Get products list with filtering and pagination
 * GET /api/products
 */
export const getProducts = async (filter: ProductFilter = { page: 1, limit: 20 }): Promise<ProductListResponse> => {
  const params: Record<string, string | number | boolean | undefined> = {
    page: filter.page || 1,
    limit: filter.limit || 20,
  };

  if (filter.category !== undefined) params.category = filter.category;
  if (filter.categoryId !== undefined) params.category = filter.categoryId;
  if (filter.search) params.search = filter.search;
  if (filter.minPrice !== undefined) params.minPrice = filter.minPrice;
  if (filter.maxPrice !== undefined) params.maxPrice = filter.maxPrice;
  if (filter.sort) params.sortBy = filter.sort;
  if (filter.sortBy) params.sortBy = filter.sortBy;
  if (filter.inStock) params.inStock = filter.inStock;

  const response = await apiClient.get<{ products: Product[]; pagination: ProductListResponse['pagination'] }>('/products', params);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch products');
  }

  return {
    products: response.data.products,
    pagination: response.data.pagination,
  };
};

/**
 * Get product detail by SKU
 * GET /api/products/:sku
 */
export const getProductBySku = async (sku: string): Promise<ProductDetailResponse> => {
  const response = await apiClient.get<Product>(`/products/${sku}`);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Product not found');
  }

  return {
    product: response.data,
  };
};

/**
 * Get product detail by ID
 */
export const getProductById = async (id: number): Promise<ProductDetailResponse> => {
  // Search by ID
  const response = await apiClient.get<Product[]>('/products', { id });

  if (!response.success || !response.data || response.data.length === 0) {
    throw new Error(response.error || 'Product not found');
  }

  return {
    product: response.data[0],
  };
};

/**
 * Get featured products
 * GET /api/products/featured
 */
export const getFeaturedProducts = async (limit: number = 8): Promise<Product[]> => {
  const response = await apiClient.get<{ products: Product[] }>('/products/featured', { limit });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch featured products');
  }

  return response.data.products;
};

/**
 * Get new arrival products
 * GET /api/products/new-arrivals
 */
export const getNewArrivals = async (limit: number = 8): Promise<Product[]> => {
  const response = await apiClient.get<{ products: Product[] }>('/products/new-arrivals', { limit });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch new arrivals');
  }

  return response.data.products;
};

/**
 * Get promotion products
 * GET /api/products/best-sellers
 */
export const getPromotionProducts = async (limit: number = 8): Promise<Product[]> => {
  const response = await apiClient.get<{ products: Product[] }>('/products/best-sellers', { limit });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch promotion products');
  }

  return response.data.products;
};

/**
 * Search products
 * GET /api/products/search?q={query}
 */
export const searchProducts = async (
  query: string, 
  options: { limit?: number; category?: string | number } = {}
): Promise<Product[]> => {
  const params: Record<string, string | number> = {
    q: query,
    limit: options.limit || 20,
  };

  if (options.category !== undefined) {
    params.category = options.category;
  }

  const response = await apiClient.get<{ products: Product[]; pagination: ProductListResponse['pagination'] }>('/products/search', params);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to search products');
  }

  return response.data.products;
};

// Export all functions
export const productApi = {
  getProducts,
  getProductBySku,
  getProductById,
  getFeaturedProducts,
  getNewArrivals,
  getPromotionProducts,
  searchProducts,
};

export default productApi;
