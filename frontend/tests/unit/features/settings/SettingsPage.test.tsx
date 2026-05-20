import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SettingsPage } from '@/features/settings/components/SettingsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import * as api from '@/features/settings/api';
import { authApi } from '@/features/auth/api';

// Mock the API calls
vi.mock('@/features/settings/api', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  toggle2FA: vi.fn(),
  requestEmailChange: vi.fn(),
  verifyEmailChange: vi.fn(),
  setup2FA: vi.fn(),
  send2FAEmail: vi.fn(),
}));

vi.mock('@/features/auth/api', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
  },
}));

// Mock the Auth Store
vi.mock('@/features/auth/store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock Toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('SettingsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.resetAllMocks();

    (useAuthStore as any).mockReturnValue({
      user: {
        id: 1,
        email: 'test@example.com',
        role: 'patient',
        patient_profile: { name: 'John Doe', dob: '1990-01-01', blood_group: 'O+' },
      },
      updateUser: vi.fn(),
    });

    (api.getSettings as any).mockResolvedValue({
      email_notifications: true,
      push_notifications: false,
      theme: 'system',
      language: 'en-US',
    });

    (authApi.getCurrentUser as any).mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      role: 'patient',
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

  it('renders correctly and fetches settings', async () => {
    renderComponent();

    // Check loading state first
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    // Wait for data
    await waitFor(() => {
      expect(screen.getByText('Identity')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('submits profile update', async () => {
    (api.updateProfile as any).mockResolvedValue({ success: true });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Identity')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Profile');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalled();
    });
  });
});
