import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useLiff } from '@/hooks/useLiff';

// Pages
import { HomePage } from '@/pages/HomePage';
import { ShopPage } from '@/pages/ShopPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SearchPage } from '@/pages/SearchPage';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthBootstrap() {
  const { isReady, isLoggedIn, profile, error, login, getIdToken } = useLiff();
  const { user, isAuthenticated, login: loginWithBackend, fetchUser } = useAuthStore();
  const lastBootstrapUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || error || isLoggedIn) {
      return;
    }
    if (sessionStorage.getItem('manual_logout') === '1') {
      return;
    }
    login();
  }, [error, isLoggedIn, isReady, login]);

  useEffect(() => {
    if (!isReady || !isLoggedIn || !profile?.userId) {
      return;
    }

    const idToken = getIdToken();
    if (!idToken) {
      return;
    }

    if (!isAuthenticated || user?.lineUserId !== profile.userId) {
      if (lastBootstrapUserId.current === profile.userId) {
        return;
      }

      lastBootstrapUserId.current = profile.userId;
      void loginWithBackend({
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
        idToken,
      }).catch(() => {
        lastBootstrapUserId.current = null;
      });
      return;
    }

    if (!user?.memberCode) {
      void fetchUser();
    }
  }, [fetchUser, getIdToken, isAuthenticated, isLoggedIn, isReady, loginWithBackend, profile, user?.lineUserId, user?.memberCode]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:sku" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderNo" element={<OrderDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;