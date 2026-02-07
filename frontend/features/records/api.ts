import { apiClient } from '@/lib/api/axios';
import type { MedicalFile, LabResult, Prescription, Encounter, SymptomLog } from './types';

// Get all medical files
export async function getMedicalFiles(params?: {
  kind?: string;
  patient?: number;
}): Promise<{ results: MedicalFile[] }> {
  const response = await apiClient.get('/api/records/files/', { params });
  return response.data;
}

// Get lab results
export async function getLabResults(patientId?: number): Promise<{ results: LabResult[] }> {
  const params = patientId ? { patient: patientId } : {};
  const response = await apiClient.get('/api/records/lab-results/', { params });
  return response.data;
}

// Get prescriptions
export async function getPrescriptions(patientId?: number): Promise<{ results: Prescription[] }> {
  const params = patientId ? { patient: patientId } : {};
  const response = await apiClient.get('/api/records/prescriptions/', { params });
  return response.data;
}

// Get encounters
export async function getEncounters(patientId?: number): Promise<{ results: Encounter[] }> {
  const params = patientId ? { patient: patientId } : {};
  const response = await apiClient.get('/api/records/encounters/', { params });
  return response.data;
}

// Get symptom logs
export async function getSymptomLogs(patientId?: number): Promise<{ results: SymptomLog[] }> {
  const params = patientId ? { patient: patientId } : {};
  const response = await apiClient.get('/api/records/symptom-logs/', { params });
  return response.data;
}

// Upload medical file (backend expects multipart at files/upload/)
export async function uploadMedicalFile(data: FormData): Promise<MedicalFile> {
  const response = await apiClient.post('/api/records/files/upload/', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

// Get signed download link for a file
export async function getMedicalFileLink(fileId: number): Promise<{ url: string; expires_in: number }> {
  const response = await apiClient.get(`/api/records/files/${fileId}/link/`);
  return response.data;
}

// Fetch file content as blob (for in-app viewing; uses auth)
export async function getMedicalFileBlob(fileId: number): Promise<Blob> {
  const response = await apiClient.get(`/api/records/files/${fileId}/serve/`, {
    responseType: 'blob',
  });
  return response.data;
}

// Delete medical file
export async function deleteMedicalFile(fileId: number): Promise<void> {
  await apiClient.delete(`/api/records/files/${fileId}/`);
}
