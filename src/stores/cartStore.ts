import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart, CartItem } from '@/types/cart';
import type { Product } from '@/types/product';
import { cartApi } from '@/api/cartApi';

interface CartState {
  cart: Cart;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, quantity: number, notes?: string) => Promise<void>;
  updateQuantity: (sku: string, quantity: number) => Promise<void>;
  removeItem: (sku: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  
  // Local actions (for optimistic updates)
  addItemLocal: (product: Product, quantity: number) => void;
  updateQuantityLocal: (sku: string, quantity: number) => void;
  removeItemLocal: (sku: string) => void;
}

const initialCart: Cart = {
  items: [],
  totalItems: 0,
  totalQuantity: 0,
  totalAmount: 0,
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: initialCart,
      isLoading: false,
      error: null,

      fetchCart: async () => {
        try {
          set({ isLoading: true, error: null });
          const cart = await cartApi.getCart();
          set({ cart, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch cart',
            isLoading: false 
          });
        }
      },

      addToCart: async (product, quantity, notes) => {
        try {
          set({ isLoading: true, error: null });
          
          // Optimistic update
          get().addItemLocal(product, quantity);
          
          // API call
          const cart = await cartApi.addToCart(product.sku, quantity, notes);
          
          set({ cart, isLoading: false });
        } catch (error) {
          // Revert optimistic update
          await get().fetchCart();
          set({ 
            error: error instanceof Error ? error.message : 'Failed to add to cart',
            isLoading: false 
          });
        }
      },

      updateQuantity: async (sku, quantity) => {
        try {
          set({ isLoading: true, error: null });
          
          // Optimistic update
          get().updateQuantityLocal(sku, quantity);
          
          // API call
          const cart = await cartApi.updateCartItem(sku, quantity);
          set({ cart, isLoading: false });
        } catch (error) {
          await get().fetchCart();
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update cart',
            isLoading: false 
          });
        }
      },

      removeItem: async (sku) => {
        try {
          set({ isLoading: true, error: null });
          
          // Optimistic update
          get().removeItemLocal(sku);
          
          // API call
          const cart = await cartApi.removeFromCart(sku);
          set({ cart, isLoading: false });
        } catch (error) {
          await get().fetchCart();
          set({ 
            error: error instanceof Error ? error.message : 'Failed to remove item',
            isLoading: false 
          });
        }
      },

      clearCart: async () => {
        try {
          set({ isLoading: true, error: null });
          const { cart } = get();
          await cartApi.clearCart(cart.items);
          set({ cart: initialCart, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to clear cart',
            isLoading: false 
          });
        }
      },

      applyCoupon: async (code) => {
        try {
          set({ isLoading: true, error: null });
          // TODO: Implement coupon API
          console.log('Apply coupon:', code);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Invalid coupon code',
            isLoading: false 
          });
        }
      },

      removeCoupon: async () => {
        try {
          set({ isLoading: true, error: null });
          // TODO: Implement remove coupon API
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to remove coupon',
            isLoading: false 
          });
        }
      },

      // Local actions for optimistic updates
      addItemLocal: (product, quantity) => {
        const { cart } = get();
        const existingItem = cart.items.find(item => item.sku === product.sku);
        
        let newItems: CartItem[];
        if (existingItem) {
          newItems = cart.items.map(item =>
            item.sku === product.sku
              ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * (item.unitPrice || item.price || 0) }
              : item
          );
        } else {
          const newItem: CartItem = {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            imageUrl: product.imageUrl,
            price: product.retailPrice,
            unitPrice: product.retailPrice,
            originalPrice: product.originalPrice,
            quantity,
            maxQty: product.maxOrderQty || 99,
            stockQty: product.stockQty,
            stockStatus: product.stockStatus,
            subtotal: quantity * product.retailPrice,
            shortDescription: product.shortDescription,
          };
          newItems = [...cart.items, newItem];
        }

        const totalItems = newItems.length;
        const totalQuantity = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce((sum, item) => sum + item.subtotal, 0);

        set({
          cart: {
            items: newItems,
            totalItems,
            totalQuantity,
            totalAmount,
          },
        });
      },

      updateQuantityLocal: (sku, quantity) => {
        const { cart } = get();
        
        if (quantity <= 0) {
          get().removeItemLocal(sku);
          return;
        }

        const newItems = cart.items.map(item =>
          item.sku === sku
            ? { ...item, quantity, subtotal: quantity * (item.unitPrice || item.price || 0) }
            : item
        );

        const totalItems = newItems.length;
        const totalQuantity = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce((sum, item) => sum + item.subtotal, 0);

        set({
          cart: {
            items: newItems,
            totalItems,
            totalQuantity,
            totalAmount,
          },
        });
      },

      removeItemLocal: (sku) => {
        const { cart } = get();
        const newItems = cart.items.filter(item => item.sku !== sku);
        
        const totalItems = newItems.length;
        const totalQuantity = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce((sum, item) => sum + item.subtotal, 0);

        set({
          cart: {
            items: newItems,
            totalItems,
            totalQuantity,
            totalAmount,
          },
        });
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
