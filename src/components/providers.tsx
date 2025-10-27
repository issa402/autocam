/**
 * Providers Component
 * 
 * This component wraps the app with necessary providers:
 * - React Query (for API calls and caching)
 * - Toast notifications
 * 
 * Why providers?
 * - Centralized configuration
 * - Avoid prop drilling
 * - Share state across components
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Providers Component
 * 
 * @param children - App content
 */
export function Providers({ children }: { children: React.ReactNode }) {
  /**
   * Create Query Client
   * 
   * React Query configuration:
   * - Caches API responses
   * - Automatic refetching
   * - Background updates
   * - Optimistic updates
   * 
   * Why React Query?
   * - Eliminates boilerplate for API calls
   * - Automatic caching and invalidation
   * - Loading and error states
   * - Pagination and infinite scroll support
   */
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: How long data is considered fresh
            // 5 minutes = good balance
            staleTime: 5 * 60 * 1000,
            
            // Cache time: How long unused data stays in cache
            // 10 minutes
            gcTime: 10 * 60 * 1000,
            
            // Retry failed requests
            retry: 1,
            
            // Refetch on window focus (user comes back to tab)
            refetchOnWindowFocus: false,
            
            // Refetch on reconnect (internet comes back)
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

