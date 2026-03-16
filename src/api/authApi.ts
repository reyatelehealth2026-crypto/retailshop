/**
 * Auth API
 * API สำหรับการยืนยันตัวตน - เชื่อมต่อกับ Backend PHP จริง
 */

import liff from '@line/liff';
import { apiClient } from './client';
import type { User, LineLoginRequest, LineLoginResponse } from '@/types/user';

interface AuthResponse {
  user: User;
  token: string;
  isNewUser: boolean;
}

interface ProfileResponse {
  user: User;
  addresses: Array<{
    id: number;
    type: string;
    isDefault: boolean;
    recipientName: string;
    recipientPhone: string;
    addressLine1: string;
    addressLine2?: string;
    province: string;
    district: string;
    subdistrict: string;
    postalCode: string;
    deliveryNote?: string;
  }>;
}

/**
 * LINE Login
 * POST /api/auth/line-login
 */
export const lineLogin = async (data: LineLoginRequest): Promise<LineLoginResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/line-login', {
    lineUserId: data.lineUserId,
    idToken: data.idToken,
    displayName: data.displayName,
    pictureUrl: data.pictureUrl,
    statusMessage: data.statusMessage,
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'LINE login failed');
  }

  sessionStorage.removeItem('manual_logout');
  // Store token in localStorage for subsequent requests
  localStorage.setItem('auth_token', response.data.token);

  return {
    success: true,
    user: response.data.user,
    token: response.data.token,
    isNewUser: response.data.isNewUser,
  };
};

/**
 * Get user profile
 * GET /api/auth/profile
 */
export const getUserProfile = async (_lineUserId: string): Promise<Partial<User>> => {
  const response = await apiClient.get<ProfileResponse>('/auth/profile');

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to get user profile');
  }

  return response.data.user;
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateUserProfile = async (
  _lineUserId: string,
  data: Partial<User>
): Promise<User> => {
  const response = await apiClient.put<ProfileResponse>('/auth/profile', {
    first_name: data.firstName,
    last_name: data.lastName,
    phone: data.phone,
    email: data.email,
    date_of_birth: data.dateOfBirth,
    gender: data.gender,
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to update profile');
  }

  return response.data.user;
};

/**
 * Logout
 * Client-side only - clears local storage
 */
export const logout = (): void => {
  sessionStorage.setItem('manual_logout', '1');
  localStorage.removeItem('auth-storage');
  localStorage.removeItem('cart-storage');
  localStorage.removeItem('auth_token');
  try {
    if (liff.isLoggedIn()) {
      liff.logout();
    }
  } catch {
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (!authData) return false;

    const parsed = JSON.parse(authData);
    return parsed.state?.isAuthenticated && parsed.state?.user?.lineUserId;
  } catch {
    return false;
  }
};

/**
 * Get current user from storage
 */
export const getCurrentUser = (): Partial<User> | null => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (!authData) return null;

    const parsed = JSON.parse(authData);
    return parsed.state?.user || null;
  } catch {
    return null;
  }
};

// Export all functions
export const authApi = {
  lineLogin,
  getUserProfile,
  updateUserProfile,
  logout,
  isAuthenticated,
  getCurrentUser,
};

export default authApi;
