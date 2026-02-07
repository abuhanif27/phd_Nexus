import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User session information - matches Django backend
 */
export interface User {
  id: number;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  phone?: string | null;
  twofa_enabled?: boolean;
}

/**
 * Session store interface
 */
interface SessionStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

/**
 * Session store using Zustand
 * Persisted to localStorage
 */
export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'session-storage',
      // Only persist user data, not the entire state
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
