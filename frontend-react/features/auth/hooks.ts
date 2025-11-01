import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';
import { setTokens, clearTokens } from '@/lib/auth/session';
import { useSessionStore } from '@/store/useSession';
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
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: authApi.getCurrentUser,
    retry: false,
    staleTime: Infinity, // User data rarely changes
  });
}

/**
 * Hook for login mutation
 */
export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setUser } = useSessionStore();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Store tokens
      setTokens(data.access, data.refresh);

      // Update session store
      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
      });

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
    onSuccess: () => {
      toast({
        title: 'Account created!',
        description: 'Please login with your credentials.',
      });
      router.push('/login');
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
 * Hook for logout
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout: clearSession } = useSessionStore();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear tokens
      clearTokens();

      // Clear session store
      clearSession();

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
