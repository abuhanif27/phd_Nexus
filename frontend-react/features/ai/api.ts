/**
 * AI Features API Service
 * Handles AI-powered analysis, summaries, and intelligent search
 */

import { apiClient } from '@/lib/api/axios';
import type { AISummary, AIAnalysisRequest, AIAnalysisResponse } from '@/types/api';

const BASE = '/api';

/**
 * Analyze symptoms with AI (Nexus Lite or Nexus Pro)
 */
export async function analyzeSymptoms(request: {
  symptoms: string;
  mode: 'quick' | 'deep';
  model?: 'sklearn' | 'pytorch' | 'auto';
  include_history?: boolean;
  include_medical_records?: boolean;
  include_images?: boolean;
}): Promise<any> {
  const { data } = await apiClient.post(`${BASE}/ai/analyze-enhanced/`, request);
  return data;
}

/**
 * Get AI-generated summary for patient
 */
export async function getPatientSummary(patientId?: number): Promise<any> {
  const { data } = await apiClient.post(`${BASE}/ai/patient-summary/`, {
    patient_id: patientId,
  });
  return data;
}

/**
 * Generate new AI summary
 */
export async function generateSummary(patientId: number): Promise<AISummary> {
  const { data } = await apiClient.post<AISummary>(`${BASE}/ai-summary/`, {
    patient_id: patientId,
  });
  return data;
}

/**
 * AI-powered intelligent search across medical records
 */
export async function intelligentSearch(
  query: string,
  patientId?: number
): Promise<AIAnalysisResponse> {
  const { data } = await apiClient.post<AIAnalysisResponse>(`${BASE}/ai-search/`, {
    query,
    patient_id: patientId,
  });
  return data;
}

/**
 * Get specialist recommendation based on symptoms
 */
export async function getSpecialistRecommendation(symptoms: string): Promise<{
  specialist: string;
  confidence: number;
  reasoning: string;
}> {
  const { data } = await apiClient.post(`${BASE}/specialist-recommendation/`, {
    text: symptoms,
  });
  return data;
}

/**
 * AI analysis with multiple modes
 */
export async function analyzeWithAI(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const { data } = await apiClient.post<AIAnalysisResponse>(`${BASE}/ai-analysis/`, request);
  return data;
}

/**
 * Get AI insights for a specific medical record
 */
export async function getRecordInsights(
  recordType: 'lab' | 'prescription' | 'encounter',
  recordId: number
): Promise<{
  insights: string[];
  related_records: Array<{ id: number; type: string; title: string }>;
}> {
  const { data } = await apiClient.get(`${BASE}/record-insights/`, {
    params: { record_type: recordType, record_id: recordId },
  });
  return data;
}
