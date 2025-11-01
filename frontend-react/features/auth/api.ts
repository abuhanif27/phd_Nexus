import { api } from '@/lib/api/axios';
import { LoginInput, LoginResponse, RegisterInput, User } from './schemas';

/**
 * Auth API endpoints
 */
export const authApi = {
  /**
   * Login with email and password
   */
  login: async (data: LoginInput): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/api/auth/login/', data);
  },

  /**
   * Register a new user
   */
  register: async (data: RegisterInput): Promise<User> => {
    const payload = {
      email: data.email,
      password: data.password,
      role: data.role,
      phone: data.phone,
    };
    return api.post<User>('/api/auth/register/', payload);
  },

  /**
   * Refresh access token
   */
  refresh: async (refreshToken: string): Promise<{ access: string; refresh: string }> => {
    return api.post('/api/auth/refresh/', { refresh: refreshToken });
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    return api.get<User>('/api/auth/me/');
  },

  /**
   * Logout (optional - clear tokens client-side)
   */
  logout: async (): Promise<void> => {
    // If you have a logout endpoint:
    // return api.post('/api/auth/logout/');

    // Otherwise, just resolve (tokens cleared client-side)
    return Promise.resolve();
  },
};
