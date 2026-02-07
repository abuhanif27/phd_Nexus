import { apiClient } from '@/lib/api/axios';
import type { HealthSummary } from './types';

// Get health summary for the current patient
export async function getHealthSummary(): Promise<HealthSummary> {
  const response = await apiClient.get('/api/health/summary/');
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
