/**
 * API Client with Automatic Token Refresh
 *
 * This client handles:
 * - Automatic token refresh on 401 errors
 * - Retry logic for failed requests
 * - Token management
 */

import { useAuthStore } from '@/stores/auth-store';

/**
 * Fetch wrapper that handles token refresh
 * This must be called from a client component
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get current auth state
  let authStore = useAuthStore.getState();

  // Add authorization header if token exists
  const headers = new Headers(options.headers || {});
  if (authStore.accessToken) {
    headers.set('Authorization', `Bearer ${authStore.accessToken}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If 401, try to refresh token and retry
  if (response.status === 401 && authStore.refreshToken) {
    try {
      console.log('Access token expired, refreshing...');

      // Call refresh endpoint
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: authStore.refreshToken,
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const { accessToken, refreshToken } = refreshData.data;

        // Update tokens in store
        authStore.setAccessToken(accessToken);
        authStore.setRefreshToken(refreshToken);

        // Get updated store state
        authStore = useAuthStore.getState();

        // Retry original request with new token
        headers.set('Authorization', `Bearer ${authStore.accessToken}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        // Refresh failed, redirect to login
        authStore.clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      authStore.clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  }

  return response;
}

