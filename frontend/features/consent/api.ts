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

/**
 * Doctor requests permission to book for a patient
 */
export async function requestBookingPermission(patientId: number): Promise<{ 
  message: string, 
  notification_id: number 
}> {
  const { data } = await apiClient.post(`${BASE}/request-booking/`, { patient_id: patientId });
  return data;
}

/**
 * Patient approves a doctor's booking permission request
 */
export async function approveBookingPermission(
  doctorId: number, 
  notificationId?: number
): Promise<{ 
  message: string, 
  consent_id: number 
}> {
  const { data } = await apiClient.post(`${BASE}/approve-booking/`, { 
    doctor_id: doctorId, 
    notification_id: notificationId 
  });
  return data;
}
