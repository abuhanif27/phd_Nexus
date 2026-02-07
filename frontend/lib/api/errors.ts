import { AxiosError } from 'axios';
import { z } from 'zod';

/**
 * Django REST Framework error response structure
 */
export interface DRFErrorResponse {
  [field: string]: string[] | string | DRFErrorResponse;
}

/**
 * Normalized error structure for the application
 */
export interface AppError {
  message: string;
  field?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Check if error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError).isAxiosError === true;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Axios error
  if (isAxiosError(error)) {
    const data = error.response?.data as DRFErrorResponse | undefined;

    // DRF error responses
    if (data) {
      // Non-field errors
      if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
        return data.non_field_errors[0];
      }

      // Detail message
      if (typeof data.detail === 'string') {
        return data.detail;
      }

      // First field error
      const firstField = Object.keys(data)[0];
      if (firstField && Array.isArray(data[firstField])) {
        return (data[firstField] as string[])[0];
      }
    }

    // Generic error messages
    if (error.response?.status === 401) {
      return 'Authentication failed. Please login again.';
    }
    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.response?.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error.response?.status === 500) {
      return 'An internal server error occurred. Please try again later.';
    }
    if (error.message) {
      return error.message;
    }
  }

  // Zod validation error
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || 'Validation error';
  }

  // Generic error
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}

/**
 * Extract field errors from DRF error response for React Hook Form
 */
export function extractFieldErrors(error: unknown): Record<string, string[]> | null {
  if (!isAxiosError(error)) return null;

  const data = error.response?.data as DRFErrorResponse | undefined;
  if (!data) return null;

  const fieldErrors: Record<string, string[]> = {};

  Object.entries(data).forEach(([field, messages]) => {
    if (field === 'non_field_errors' || field === 'detail') return;

    if (Array.isArray(messages)) {
      fieldErrors[field] = messages;
    } else if (typeof messages === 'string') {
      fieldErrors[field] = [messages];
    }
  });

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

/**
 * Convert error to AppError format
 */
export function normalizeError(error: unknown): AppError {
  return {
    message: getErrorMessage(error),
    fieldErrors: extractFieldErrors(error) || undefined,
  };
}
