import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Default options for TanStack Query
 */
const queryConfig: DefaultOptions = {
  queries: {
    // Global defaults for all queries
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
  },
  mutations: {
    // Global defaults for all mutations
    retry: 0,
  },
};

/**
 * Create a new QueryClient instance
 * Use this for SSR/server components
 */
export function makeQueryClient() {
  return new QueryClient({ defaultOptions: queryConfig });
}

/**
 * Browser query client singleton
 * Persists across client-side navigations
 */
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Get or create query client for browser
 */
export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new query client
    return makeQueryClient();
  }

  // Browser: create query client if it doesn't exist
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}
