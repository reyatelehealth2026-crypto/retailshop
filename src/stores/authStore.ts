import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserProfile, LineLoginRequest } from '@/types/user';
import { authApi } from '@/api/authApi';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;

  // Actions
  login: (data: LineLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,

      login: async (data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.lineLogin(data);
          
          // Store token and user
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          authApi.logout();
        } finally {
          get().clearAuth();
        }
      },

      fetchUser: async () => {
        try {
          set({ isLoading: true, error: null });
          const currentUser = get().user;
          if (currentUser?.lineUserId) {
            const user = await authApi.getUserProfile(currentUser.lineUserId);
            set({ user: { ...currentUser, ...user }, isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch user',
            isLoading: false,
          });
        }
      },

      updateProfile: async (data) => {
        try {
          set({ isLoading: true, error: null });
          const currentUser = get().user;
          if (currentUser?.lineUserId) {
            const user = await authApi.updateUserProfile(currentUser.lineUserId, data);
            set({ user: { ...currentUser, ...user }, isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update profile',
            isLoading: false,
          });
        }
      },

      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          token: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
);
