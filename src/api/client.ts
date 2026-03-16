/**
 * RE-YA Retail API Client
 * Client สำหรับเชื่อมต่อกับ Backend API PHP
 */

// API Base URL - ปรับตาม environment
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

// Request options interface
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

// API Response interface
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  try {
    // First try to get the dedicated auth token
    const token = localStorage.getItem('auth_token');
    if (token) return token;

    // Fallback to auth store
    const authData = localStorage.getItem('auth-storage');
    if (!authData) return null;

    const parsed = JSON.parse(authData);
    return parsed.state?.token || null;
  } catch {
    return null;
  }
}

/**
 * Make API request
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, params, headers = {} } = options;

  // Build URL with query params
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers,
  };

  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Build request config
  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    // Parse JSON response
    const data = await response.json();

    // Check for HTTP errors
    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `HTTP Error: ${response.status}`,
        details: data.details,
      };
    }

    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API Request Error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection.',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * API Client Object
 */
export const apiClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  /**
   * POST request
   */
  post: <T>(endpoint: string, body: Record<string, unknown>) =>
    request<T>(endpoint, { method: 'POST', body }),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body: Record<string, unknown>) =>
    request<T>(endpoint, { method: 'PUT', body }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, body?: Record<string, unknown>) =>
    request<T>(endpoint, { method: 'DELETE', body }),
};

export default apiClient;
export type { ApiResponse, RequestOptions };
