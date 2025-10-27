/**
 * Authentication Store (Zustand)
 * 
 * This manages user authentication state.
 * 
 * What it stores:
 * - User information
 * - Access token (JWT)
 * - Refresh token
 * - Authentication status
 * 
 * Why separate auth store?
 * - Security (tokens in one place)
 * - Easy to check auth status anywhere
 * - Centralized login/logout logic
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { User } from '@/types';

/**
 * Auth store state interface
 */
interface AuthState {
  // Data
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
}

/**
 * Create auth store
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        
        /**
         * Sets authentication data after login/register
         * 
         * @param user - User object
         * @param accessToken - JWT access token
         * @param refreshToken - JWT refresh token
         */
        setAuth: (user, accessToken, refreshToken) => set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),
        
        /**
         * Clears authentication data on logout
         */
        clearAuth: () => set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
        
        /**
         * Updates user information
         * 
         * @param updates - Partial user object with updates
         */
        updateUser: (updates) => set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
        
        /**
         * Updates access token (after refresh)
         *
         * @param token - New access token
         */
        setAccessToken: (token) => set({ accessToken: token }),

        /**
         * Updates refresh token (after refresh)
         *
         * @param token - New refresh token
         */
        setRefreshToken: (token) => set({ refreshToken: token }),
      }),
      {
        name: 'auth-store', // localStorage key
      }
    )
  )
);

/**
 * Hook to check if auth store has been hydrated from localStorage
 * Use this to prevent redirect loops during hydration
 */
export function useAuthHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after component mounts
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

