/**
 * WARNING: Storing JWT tokens in localStorage is vulnerable to XSS attacks.
 *
 * RECOMMENDED APPROACH (for production):
 * 1. Configure Django to send JWT as HttpOnly cookies
 * 2. Configure Django CORS to allow credentials
 * 3. Remove localStorage usage entirely
 *
 * For local development, this approach is acceptable with proper XSS prevention:
 * - Content Security Policy (CSP)
 * - Input sanitization
 * - Output encoding
 * - Regular security audits
 */

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Get access token from storage
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from storage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store both access and refresh tokens
 */
export function setTokens(accessToken: string, refreshToken: string, rememberMe: boolean = true): void {
  if (typeof window === 'undefined') return;
  const storage = rememberMe ? localStorage : sessionStorage;
  
  // Clear from the other storage to avoid conflicts
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem(ACCESS_TOKEN_KEY);
  otherStorage.removeItem(REFRESH_TOKEN_KEY);

  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Clear all tokens (logout)
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Parse JWT token payload (without verification - for display purposes only)
 * DO NOT use this for authorization decisions on the client
 */
export function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Get user info from token (for display only)
 */
export function getUserFromToken(): { id?: number; email?: string; username?: string } | null {
  const token = getAccessToken();
  if (!token) return null;

  const payload = parseJwtPayload(token);
  return payload
    ? {
        id: payload.user_id,
        email: payload.email,
        username: payload.username,
      }
    : null;
}
