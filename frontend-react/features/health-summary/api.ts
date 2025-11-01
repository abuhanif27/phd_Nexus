import { apiClient } from '@/lib/api/axios';
import type { HealthSummary } from './types';

// Get health summary for the current patient
export async function getHealthSummary(): Promise<HealthSummary> {
  const response = await apiClient.get('/api/health/summary/');
  return response.data;
}

// Get AI-powered health insights
export async function getHealthInsights(): Promise<{ insights: string[] }> {
  const response = await apiClient.get('/api/health/insights/');
  return response.data;
}

// Get health score
export async function getHealthScore(): Promise<{ score: number; factors: any[] }> {
  const response = await apiClient.get('/api/health/score/');
  return response.data;
}
