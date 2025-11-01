/**
 * Patient API Service
 * Handles all patient-related API calls
 */

import { apiClient } from '@/lib/api/axios';
import type {
  Patient,
  PatientCreateRequest,
  PaginatedResponse,
  Appointment,
  MedicalFile,
  LabResult,
  Prescription,
  Encounter,
} from '@/types/api';

const BASE = '/api/patients';

/**
 * Get current patient profile
 */
export async function getMyProfile(): Promise<Patient> {
  const { data } = await apiClient.get<Patient>(`${BASE}/me/`);
  return data;
}

/**
 * Create or update patient profile
 */
export async function createOrUpdateProfile(profile: PatientCreateRequest): Promise<Patient> {
  const { data } = await apiClient.post<Patient>(`${BASE}/me/`, profile);
  return data;
}

/**
 * Get patient appointments
 */
export async function getMyAppointments(
  status?: 'scheduled' | 'canceled' | 'done'
): Promise<PaginatedResponse<Appointment>> {
  const { data } = await apiClient.get<PaginatedResponse<Appointment>>(`${BASE}/appointments/`, {
    params: { status },
  });
  return data;
}

/**
 * Get patient medical files
 */
export async function getMyFiles(kind?: string): Promise<PaginatedResponse<MedicalFile>> {
  const { data } = await apiClient.get<PaginatedResponse<MedicalFile>>(`${BASE}/files/`, {
    params: { kind },
  });
  return data;
}

/**
 * Upload medical file
 */
export async function uploadFile(file: File, kind: string): Promise<MedicalFile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);

  const { data } = await apiClient.post<MedicalFile>(`${BASE}/files/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

/**
 * Get lab results
 */
export async function getLabResults(): Promise<PaginatedResponse<LabResult>> {
  const { data } = await apiClient.get<PaginatedResponse<LabResult>>(`${BASE}/lab-results/`);
  return data;
}

/**
 * Get prescriptions
 */
export async function getPrescriptions(): Promise<PaginatedResponse<Prescription>> {
  const { data } = await apiClient.get<PaginatedResponse<Prescription>>(`${BASE}/prescriptions/`);
  return data;
}

/**
 * Get encounter notes
 */
export async function getEncounters(): Promise<PaginatedResponse<Encounter>> {
  const { data } = await apiClient.get<PaginatedResponse<Encounter>>(`${BASE}/encounters/`);
  return data;
}

/**
 * Get patient dashboard stats
 */
export async function getDashboardStats(): Promise<{
  upcoming_appointments: number;
  total_records: number;
  recent_labs: number;
  active_prescriptions: number;
}> {
  const { data } = await apiClient.get(`${BASE}/dashboard/stats/`);
  return data;
}
