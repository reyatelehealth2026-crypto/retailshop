import { useCallback } from 'react';
import { useCartStore } from '@/stores/cartStore';
import type { Product } from '@/types/product';

export const useCart = () => {
  const {
    cart,
    isLoading,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const addProduct = useCallback(async (product: Product, quantity: number = 1) => {
    await addToCart(product, quantity);
  }, [addToCart]);

  const incrementQuantity = useCallback(async (sku: string) => {
    const item = cart.items.find((i) => i.sku === sku);
    if (item) {
      await updateQuantity(sku, item.quantity + 1);
    }
  }, [cart.items, updateQuantity]);

  const decrementQuantity = useCallback(async (sku: string) => {
    const item = cart.items.find((i) => i.sku === sku);
    if (item && item.quantity > 1) {
      await updateQuantity(sku, item.quantity - 1);
    }
  }, [cart.items, updateQuantity]);

  const getItemCount = useCallback((sku: string) => {
    const item = cart.items.find((i) => i.sku === sku);
    return item?.quantity || 0;
  }, [cart.items]);

  const isInCart = useCallback((sku: string) => {
    return cart.items.some((i) => i.sku === sku);
  }, [cart.items]);

  return {
    cart,
    isLoading,
    error,
    addProduct,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    getItemCount,
    isInCart,
  };
};