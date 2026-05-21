/**
 * Doctor API Service
 * Handles all doctor-related API calls
 */

import { apiClient } from '@/lib/api/axios';
import type {
  Doctor,
  DoctorCreateRequest,
  PaginatedResponse,
  Appointment,
  DoctorAvailability,
  Patient,
} from '@/types/api';

const BASE = '/api/doctors';

/**
 * Get all doctors (for patient booking)
 */
export async function getDoctors(params?: {
  specialty?: string;
  search?: string;
  location?: string;
}): Promise<PaginatedResponse<Doctor>> {
  const { data } = await apiClient.get<PaginatedResponse<Doctor>>(BASE, { params });
  return data;
}

/**
 * Get doctor details
 */
export async function getDoctor(id: number): Promise<Doctor> {
  const { data } = await apiClient.get<Doctor>(`${BASE}/${id}/`);
  return data;
}

/**
 * Get current doctor profile
 */
export async function getMyProfile(): Promise<Doctor> {
  const { data } = await apiClient.get<Doctor>(`${BASE}/me/`);
  return data;
}

/**
 * Create or update doctor profile
 */
export async function createOrUpdateProfile(profile: DoctorCreateRequest): Promise<Doctor> {
  const { data } = await apiClient.post<Doctor>(`${BASE}/me/`, profile);
  return data;
}

/**
 * Get doctor availability
 */
export async function getMyAvailability(params?: {
  month?: number;
  year?: number;
}): Promise<DoctorAvailability[]> {
  const { data } = await apiClient.get<DoctorAvailability[] | { results: DoctorAvailability[] }>(
    `${BASE}/availability/`,
    { params }
  );
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data) return data.results;
  return [];
}

export type AvailabilityPayload = Omit<
  DoctorAvailability,
  'id' | 'doctor' | 'end_time' | 'booked_count'
>;

/**
 * Create a date-specific availability session
 */
export async function setAvailability(
  availability: AvailabilityPayload
): Promise<DoctorAvailability> {
  const { data } = await apiClient.post<DoctorAvailability>(`${BASE}/availability/`, availability);
  return data;
}

/**
 * Update an availability session
 */
export async function updateAvailability(
  id: number,
  availability: Partial<AvailabilityPayload>
): Promise<DoctorAvailability> {
  const { data } = await apiClient.patch<DoctorAvailability>(
    `${BASE}/availability/${id}/`,
    availability
  );
  return data;
}

/**
 * Delete availability slot
 */
export async function deleteAvailability(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/availability/${id}/`);
}

/**
 * Get doctor appointments
 */
export async function getMyAppointments(params?: {
  date?: string;
  status?: 'scheduled' | 'canceled' | 'done';
}): Promise<PaginatedResponse<Appointment>> {
  const { data } = await apiClient.get<PaginatedResponse<Appointment>>(`${BASE}/appointments/`, {
    params,
  });
  return data;
}

/**
 * Get doctor's patients
 */
export async function getMyPatients(): Promise<PaginatedResponse<Patient>> {
  const { data } = await apiClient.get<PaginatedResponse<Patient>>(`${BASE}/patients/`);
  return data;
}

/**
 * Get doctor dashboard stats
 */
export async function getDashboardStats(): Promise<{
  today_appointments: number;
  total_patients: number;
  upcoming_appointments: number;
  completed_today: number;
}> {
  const { data } = await apiClient.get(`${BASE}/dashboard/stats/`);
  return data;
}
