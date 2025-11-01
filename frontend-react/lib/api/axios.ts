import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/env';

/**
 * Axios instance configured for Django REST Framework backend
 * - Base URL from environment
 * - JSON content type
 * - Credentials included for cookies
 */
export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for HttpOnly cookies
});

/**
 * Type-safe API client with better error handling
 */
export const api = {
  get: <T>(url: string, config?: any) => apiClient.get<T>(url, config).then((res) => res.data),
  post: <T>(url: string, data?: any, config?: any) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),
  put: <T>(url: string, data?: any, config?: any) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),
  patch: <T>(url: string, data?: any, config?: any) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),
  delete: <T>(url: string, config?: any) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};

export type { AxiosError, InternalAxiosRequestConfig };
