/**
 * Notifications API Service
 */

import { apiClient } from '@/lib/api/axios';
import type { PaginatedResponse } from '@/types/api';

const BASE = '/api/notifications';

export interface NotificationPayload {
  type: 'access_request' | 'appointment' | 'lab_result' | 'system';
  message: string;
  from_doctor_id?: number;
  from_doctor_user_id?: number;
  from_doctor_email?: string;
  patient_id?: number;
}

export interface BackendNotification {
  id: number;
  user: number;
  channel: 'email' | 'sms' | 'in_app';
  payload: NotificationPayload;
  status: 'sent' | 'read' | 'archived';
  error?: string;
  ts: string;
}

/**
 * Fetch user's notifications
 */
export async function getNotifications(): Promise<PaginatedResponse<BackendNotification>> {
  const { data } = await apiClient.get<PaginatedResponse<BackendNotification>>(`${BASE}/`);
  return data;
}

/**
 * Send access request notification to patient
 */
export async function requestAccessNotification(
  patientId: number,
  message: string
): Promise<{ message: string }> {
  const { data } = await apiClient.post(`${BASE}/request-access/`, {
    patient_id: patientId,
    message,
  });
  return data;
}

/**
 * Accept access request from a doctor
 */
export async function acceptAccessRequest(
  doctorId: number,
  durationHours: number = 24,
  doctorUserId?: number
): Promise<{ consent_id: number; message: string }> {
  const { data } = await apiClient.post(`${BASE}/accept-request/`, {
    doctor_id: doctorId,
    doctor_user_id: doctorUserId, // Fallback for old notifications
    duration_hours: durationHours,
  });
  return data;
}
