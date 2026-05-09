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

export const toggle2FA = async (): Promise<{ twofa_enabled: boolean; message: string }> => {
  return await api.post<{ twofa_enabled: boolean; message: string }>('/api/auth/2fa/toggle/');
};
