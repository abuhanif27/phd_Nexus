import { apiClient } from '@/lib/api/axios';
import type { HealthSummary } from './types';

export interface SavedSummary {
  id: number;
  title: string;
  text: string;
  ts: string;
  source_ids: number[];
}

// Get health summary for the current patient
export async function getHealthSummary(fileIds?: number[]): Promise<HealthSummary & { selected_source_ids?: number[] }> {
  const params = fileIds ? { file_ids: fileIds.join(',') } : {};
  const response = await apiClient.get('/api/health/summary/', { params });
  return response.data;
}

// Save a health summary to database
export async function saveHealthSummary(data: { summary: string; title?: string; source_ids?: number[] }): Promise<{ message: string; id: number }> {
  const response = await apiClient.post('/api/health/summary/', data);
  return response.data;
}

// Get all saved summaries for current patient
export async function getSavedSummaries(): Promise<{ summaries: SavedSummary[] }> {
  const response = await apiClient.get('/api/health/saved-summaries/');
  return response.data;
}

// Delete a saved summary
export async function deleteSavedSummary(id: number): Promise<{ message: string }> {
  const response = await apiClient.delete(`/api/health/saved-summaries/${id}/`);
  return response.data;
}

// Get health summary by share token (public access)
export async function getSharedHealthSummary(shareToken: string): Promise<HealthSummary> {
  const response = await apiClient.get(`/api/health/summary/?share_token=${shareToken}`);
  return response.data;
}

// Create a shareable link for health summary
export async function createHealthSummaryShare(): Promise<{
  share_token: string;
  share_url: string;
  created_at: string;
  is_active: boolean;
  message: string;
}> {
  const response = await apiClient.post('/api/health/summary/share/');
  return response.data;
}

// Get all share links for current patient
export async function getHealthSummaryShares(): Promise<{
  shares: Array<{
    share_token: string;
    share_url: string;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
    is_valid: boolean;
  }>;
}> {
  const response = await apiClient.get('/api/health/summary/share/');
  return response.data;
}

// Deactivate a share link
export async function deactivateHealthSummaryShare(
  shareToken: string
): Promise<{ message: string }> {
  const response = await apiClient.delete('/api/health/summary/share/', {
    data: { share_token: shareToken },
  });
  return response.data;
}

// Toggle active status of a share link
export async function toggleHealthSummaryShareStatus(
  shareToken: string,
  isActive?: boolean
): Promise<{ message: string; is_active: boolean }> {
  const response = await apiClient.put('/api/health/summary/share/', {
    share_token: shareToken,
    is_active: isActive,
  });
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
