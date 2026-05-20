import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';
import { setTokens, clearTokens } from '@/lib/auth/session';
import { useAuthStore } from './store';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/errors';

/**
 * Query keys for auth
 */
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
};

/**
 * Hook to get current user
 */
export function useCurrentUser() {
  const { updateUser } = useAuthStore();

  return useQuery({
    queryKey: authKeys.currentUser(),
    // Fetch fresh profile (includes doctor_profile / patient_profile) and sync to store
    queryFn: async () => {
      const user = await authApi.getCurrentUser();
      updateUser(user);
      return user;
    },
    retry: false,
    staleTime: Infinity,
  });
}

/**
 * Hook for login mutation
 */
export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data, variables) => {
      if (!data.access || !data.refresh) {
        throw new Error('Login requires additional verification before a session can be created.');
      }

      // Store tokens
      setTokens(data.access, data.refresh, variables.rememberMe);

      // Update auth store with full user data
      setAuth(data.user, data.access, data.refresh);

      // Set user in query cache
      queryClient.setQueryData(authKeys.currentUser(), data.user);

      // Show success toast
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.user.email}`,
      });

      // Redirect to dashboard
      router.push('/dashboard');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for register mutation
 */
export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (_, variables) => {
      toast({
        title: 'Account created!',
        description: 'Please verify your email with the code sent to you.',
      });
      // Redirect to verification page with email in query param
      router.push(`/verify-registration?email=${encodeURIComponent(typeof variables === 'object' && 'email' in variables ? variables.email : '')}`);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for verifying registration OTP
 */
export function useVerifyRegistration() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: authApi.verifyRegistration,
    onSuccess: (data) => {
      if (data.access && data.refresh) {
        setTokens(data.access, data.refresh, true);
        setAuth(data.user, data.access, data.refresh);
        queryClient.setQueryData(authKeys.currentUser(), data.user);
        
        toast({
          title: 'Email verified!',
          description: 'Your account is now active and you are logged in.',
        });
        router.push('/dashboard');
      } else {
        toast({
          title: 'Email verified!',
          description: data.message || 'Your account is now pending admin approval.',
        });
        router.push('/login');
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for requesting password reset
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: authApi.requestPasswordReset,
    onSuccess: (data) => {
      toast({
        title: 'Reset code sent!',
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for resetting password
 */
export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (data) => {
      toast({
        title: 'Password reset!',
        description: data.message,
      });
      router.push('/login');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for logout
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear tokens
      clearTokens();

      // Clear auth store
      clearAuth();

      // Clear all queries
      queryClient.clear();

      // Redirect to login
      router.push('/login');

      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
      });
    },
  });
}
