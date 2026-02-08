/**
 * Consent management API
 */
import { apiClient } from '@/lib/api/axios';
import type { Consent, ConsentGrantRequest, PaginatedResponse } from '@/types/api';

const BASE = '/api/consent';

/**
 * List user's consents (patients see granted, doctors see received)
 */
export async function getConsents(): Promise<PaginatedResponse<Consent>> {
  const { data } = await apiClient.get<Consent[] | PaginatedResponse<Consent>>(`${BASE}/list/`);
  
  // Handle both array and paginated response
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return data;
}

/**
 * Grant consent to a doctor
 */
export async function grantConsent(request: ConsentGrantRequest): Promise<{ 
  consent_id: number; 
  otp_last4: string; 
  message: string; 
}> {
  const { data } = await apiClient.post(`${BASE}/grant/`, request);
  return data;
}

/**
 * Revoke a consent
 */
export async function revokeConsent(consentId: number): Promise<{ message: string }> {
  const { data } = await apiClient.post(`${BASE}/revoke/${consentId}/`);
  return data;
}
