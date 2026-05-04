/**
 * Scheduling API Service
 * Handles appointment booking and management
 */

import { apiClient } from '@/lib/api/axios';
import type { Appointment, AppointmentCreateRequest, DoctorAvailability } from '@/types/api';

const BASE = '/api/scheduling';

/**
 * Get available slots for a doctor on a specific date
 */
export async function getAvailableSlots(
  doctorId: number,
  date: string
): Promise<{
  date: string;
  doctor_id: number;
  slots: Array<{ start_time: string; end_time: string; available: boolean }>;
}> {
  const { data } = await apiClient.get(`${BASE}/doctors/${doctorId}/slots/`, {
    params: { date },
  });
  return data;
}

/**
 * Book an appointment
 */
export async function bookAppointment(appointment: AppointmentCreateRequest): Promise<Appointment> {
  const { data } = await apiClient.post<Appointment>(`${BASE}/appointments/`, appointment);
  return data;
}

/**
 * List current user's appointments (patient sees their own, doctor sees theirs)
 */
export async function getMyAppointments(): Promise<Appointment[]> {
  const { data } = await apiClient.get<Appointment[] | { results: Appointment[] }>(
    `${BASE}/appointments/`
  );
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data)
    return (data as { results: Appointment[] }).results;
  return [];
}

/**
 * Get appointment details
 */
export async function getAppointment(id: number): Promise<Appointment> {
  const { data } = await apiClient.get<Appointment>(`${BASE}/appointments/${id}/`);
  return data;
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(id: number): Promise<Appointment> {
  const { data } = await apiClient.patch<Appointment>(`${BASE}/appointments/${id}/`, {
    status: 'canceled',
  });
  return data;
}

/**
 * Mark appointment as completed
 */
export async function completeAppointment(id: number): Promise<Appointment> {
  const { data } = await apiClient.patch<Appointment>(`${BASE}/appointments/${id}/`, {
    status: 'done',
  });
  return data;
}

/**
 * Update appointment notes
 */
export async function updateAppointmentNotes(id: number, notes: string): Promise<Appointment> {
  const { data } = await apiClient.patch<Appointment>(`${BASE}/appointments/${id}/`, { notes });
  return data;
}

/**
 * Get doctor availability for a week
 */
export async function getDoctorAvailability(doctorId: number): Promise<DoctorAvailability[]> {
  const { data } = await apiClient.get<DoctorAvailability[]>(
    `${BASE}/doctor-availability/${doctorId}/`
  );
  return data;
}
