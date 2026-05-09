import { api } from '@/lib/api/axios';

export interface UserSettingsData {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  appointment_reminders: boolean;
  medication_reminders: boolean;
  health_alerts: boolean;
  newsletters: boolean;
  profile_visibility: string;
  share_data_research: boolean;
  allow_ai_analysis: boolean;
  data_sync_enabled: boolean;
  theme: string;
  language: string;
  timezone: string;
}

export const getSettings = async (): Promise<UserSettingsData> => {
  return await api.get<UserSettingsData>('/api/auth/settings/');
};

export const updateSettings = async (settings: Partial<UserSettingsData>): Promise<UserSettingsData> => {
  return await api.put<UserSettingsData>('/api/auth/settings/', settings);
};

export const updateProfile = async (profileData: any): Promise<any> => {
  return await api.put<any>('/api/auth/profile/', profileData);
};

export const changePassword = async (passwordData: any): Promise<any> => {
  return await api.post<any>('/api/auth/password/change/', passwordData);
};

// --- NEW ROBUST AUTH ---

export const requestEmailChange = async (newEmail: string): Promise<{ message: string }> => {
  return await api.post('/api/auth/email/change-request/', { new_email: newEmail });
};

export const verifyEmailChange = async (code: string): Promise<{ message: string; email: string }> => {
  return await api.post('/api/auth/email/change-verify/', { code });
};

export const setup2FA = async (): Promise<{ secret: string; provisioning_uri: string }> => {
  return await api.get('/api/auth/2fa/setup/');
};

export const send2FAEmail = async (): Promise<{ message: string }> => {
  return await api.post('/api/auth/2fa/send/', {});
};

export const toggle2FA = async (data: { action: 'enable' | 'disable'; method?: string; code: string }): Promise<{ message: string }> => {
  return await api.post('/api/auth/2fa/toggle/', data);
};
