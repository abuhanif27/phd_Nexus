import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from './axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../auth/session';

/**
 * Track if we're currently refreshing to avoid multiple simultaneous refresh attempts
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

/**
 * Redirect to login without full page reload.
 * Uses a custom event so the app can handle it via Next.js router.
 * Falls back to soft navigation if no listener handles it.
 */
let redirecting = false;
function redirectToLogin() {
  if (redirecting) return;
  if (typeof window === 'undefined') return;
  // Skip if already on login page
  if (window.location.pathname === '/login') return;
  redirecting = true;
  // Dispatch event for app-level listener to handle via router.push
  window.dispatchEvent(new CustomEvent('auth:logout'));
  // Reset flag after a short delay to allow future redirects if needed
  setTimeout(() => { redirecting = false; }, 2000);
}

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Request interceptor: Attach JWT access token to all requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    // Don't attach token to login/register/refresh endpoints
    const publicEndpoints = ['/api/auth/login/', '/api/auth/register/', '/api/auth/refresh/'];
    const isPublicEndpoint = publicEndpoints.some((endpoint) => config.url?.includes(endpoint));

    if (token && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle 401 errors and attempt token refresh
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is not 401 or request has already been retried, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're currently refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    // Mark that we're attempting to refresh
    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      // No refresh token available, clear everything and redirect to login
      clearTokens();
      processQueue(error, null);
      isRefreshing = false;

      redirectToLogin();

      return Promise.reject(error);
    }

    try {
      // Attempt to refresh the token
      const response = await apiClient.post('/api/auth/refresh/', {
        refresh: refreshToken,
      });

      const { access, refresh } = response.data;
      setTokens(access, refresh);

      // Update the original request with new token
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access}`;
      }

      // Process queued requests
      processQueue(null, access);
      isRefreshing = false;

      // Retry the original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed, clear tokens and redirect to login
      processQueue(refreshError as AxiosError, null);
      clearTokens();
      isRefreshing = false;

      redirectToLogin();

      return Promise.reject(refreshError);
    }
  }
);

export { apiClient };
