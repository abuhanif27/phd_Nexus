/**
 * Notifications API Service
 */

import { apiClient } from '@/lib/api/axios';

const BASE = '/api/notifications';

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
