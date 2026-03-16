import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface UIState {
  // Toast notifications
  toasts: Toast[];
  
  // Loading states
  isPageLoading: boolean;
  isActionLoading: boolean;
  
  // UI states
  isCartOpen: boolean;
  isMenuOpen: boolean;
  
  // Actions
  addToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  
  setPageLoading: (loading: boolean) => void;
  setActionLoading: (loading: boolean) => void;
  
  setCartOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  isPageLoading: false,
  isActionLoading: false,
  isCartOpen: false,
  isMenuOpen: false,

  addToast: (message, type, duration = 3000) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, message, type, duration };
    
    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto remove
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setPageLoading: (loading) => set({ isPageLoading: loading }),
  setActionLoading: (loading) => set({ isActionLoading: loading }),
  
  setCartOpen: (open) => set({ isCartOpen: open }),
  setMenuOpen: (open) => set({ isMenuOpen: open }),
}));