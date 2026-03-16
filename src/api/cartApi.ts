/**
 * Cart API
 * API สำหรับจัดการตะกร้าสินค้า - เชื่อมต่อกับ Backend PHP จริง
 */

import { apiClient } from './client';
import type { Cart, CartItem } from '@/types/cart';

interface CartResponse {
  items: CartItem[];
  summary: {
    totalItems: number;
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
  };
}

/**
 * Get cart items
 * GET /api/cart
 */
export const getCart = async (): Promise<Cart> => {
  const response = await apiClient.get<CartResponse>('/cart');

  if (!response.success) {
    // Return empty cart if error (e.g., user not logged in)
    return {
      items: [],
      totalAmount: 0,
      totalItems: 0,
      totalQuantity: 0,
    };
  }

  const data = response.data;
  if (!data) {
    return {
      items: [],
      totalAmount: 0,
      totalItems: 0,
      totalQuantity: 0,
    };
  }

  return {
    items: data.items,
    totalAmount: data.summary.total,
    totalItems: data.summary.totalItems,
    totalQuantity: data.summary.totalItems,
  };
};

/**
 * Add item to cart
 * POST /api/cart/add
 */
export const addToCart = async (sku: string, quantity: number, _notes?: string): Promise<Cart> => {
  const body: Record<string, unknown> = {
    sku,
    quantity,
  };

  const response = await apiClient.post<CartResponse>('/cart/add', body);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to add item to cart');
  }

  const data = response.data;
  return {
    items: data.items,
    totalAmount: data.summary.total,
    totalItems: data.summary.totalItems,
    totalQuantity: data.summary.totalItems,
  };
};

/**
 * Update cart item quantity
 * PUT /api/cart/update
 */
export const updateCartItem = async (sku: string, quantity: number): Promise<Cart> => {
  const response = await apiClient.put<CartResponse>('/cart/update', {
    sku,
    quantity,
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to update cart item');
  }

  const data = response.data;
  return {
    items: data.items,
    totalAmount: data.summary.total,
    totalItems: data.summary.totalItems,
    totalQuantity: data.summary.totalItems,
  };
};

/**
 * Remove item from cart
 * DELETE /api/cart/remove/:sku
 */
export const removeFromCart = async (sku: string): Promise<Cart> => {
  const response = await apiClient.delete<CartResponse>(`/cart/remove/${sku}`);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to remove item from cart');
  }

  const data = response.data;
  return {
    items: data.items,
    totalAmount: data.summary.total,
    totalItems: data.summary.totalItems,
    totalQuantity: data.summary.totalItems,
  };
};

/**
 * Clear cart (remove all items)
 * DELETE /api/cart/clear
 */
export const clearCart = async (_items?: CartItem[]): Promise<void> => {
  await apiClient.delete<CartResponse>('/cart/clear');
};

/**
 * Sync cart with server (for offline support)
 * POST /api/cart/sync
 */
export const syncCart = async (localItems: CartItem[]): Promise<Cart> => {
  const response = await apiClient.post<CartResponse>('/cart/sync', {
    items: localItems.map(item => ({
      sku: item.sku,
      quantity: item.quantity,
    })),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to sync cart');
  }

  const data = response.data;
  return {
    items: data.items,
    totalAmount: data.summary.total,
    totalItems: data.summary.totalItems,
    totalQuantity: data.summary.totalItems,
  };
};

// Export all functions
export const cartApi = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,
};

export default cartApi;
