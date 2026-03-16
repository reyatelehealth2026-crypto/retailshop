import { useEffect, useState, useCallback } from 'react';
import liff from '@line/liff';

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface UseLiffReturn {
  isReady: boolean;
  isLoggedIn: boolean;
  profile: LiffProfile | null;
  error: Error | null;
  liff: typeof liff;
  login: () => void;
  logout: () => void;
  getAccessToken: () => string | null;
  getIdToken: () => string | null;
}

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

export const useLiff = (): UseLiffReturn => {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        if (!LIFF_ID) {
          throw new Error('LIFF ID is not configured');
        }

        await liff.init({ liffId: LIFF_ID });
        
        const loggedIn = liff.isLoggedIn();
        setIsLoggedIn(loggedIn);

        if (loggedIn) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);
        }

        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize LIFF'));
        setIsReady(true);
      }
    };

    initLiff();
  }, []);

  const login = useCallback(() => {
    if (!liff.isLoggedIn()) {
      liff.login();
    }
  }, []);

  const logout = useCallback(() => {
    if (liff.isLoggedIn()) {
      liff.logout();
      window.location.reload();
    }
  }, []);

  const getAccessToken = useCallback(() => {
    return liff.getAccessToken();
  }, []);

  const getIdToken = useCallback(() => {
    return liff.getIDToken();
  }, []);

  return {
    isReady,
    isLoggedIn,
    profile,
    error,
    liff,
    login,
    logout,
    getAccessToken,
    getIdToken,
  };
};