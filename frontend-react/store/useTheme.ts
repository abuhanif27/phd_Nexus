import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Theme store interface
 */
interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * Theme store using Zustand
 * Persisted to localStorage
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme after rehydration
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

/**
 * Initialize theme on mount
 */
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState();
  applyTheme(store.theme);
}
