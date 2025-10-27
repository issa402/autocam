/**
 * Root Layout Component
 * 
 * This is the root layout for the entire application.
 * It wraps all pages and provides:
 * - Global styles
 * - Font configuration
 * - Metadata (title, description)
 * - Providers (React Query, etc.)
 * 
 * Why this structure?
 * - Next.js 14 App Router requires layout.tsx
 * - Shared layout across all pages
 * - SEO optimization with metadata
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

/**
 * Font configuration
 * 
 * We use Inter font from Google Fonts:
 * - Modern, clean design
 * - Excellent readability
 * - Variable font (all weights in one file)
 * - Optimized by Next.js (self-hosted, no external requests)
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Show fallback font while loading
  variable: '--font-inter',
});

/**
 * Metadata for SEO
 * 
 * This appears in:
 * - Browser tab title
 * - Search engine results
 * - Social media shares
 */
export const metadata: Metadata = {
  title: 'AutoCam - Automated Photo Management for Photographers',
  description: 'AI-powered photo management system that automatically detects blurry photos, helps you select the best shots, and exports to Google Drive, Facebook, and more.',
  keywords: ['photography', 'photo management', 'AI', 'blur detection', 'sports photography'],
  authors: [{ name: 'AutoCam' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6', // Blue color
};

/**
 * Root Layout Component
 * 
 * @param children - Page content
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Providers wrap the entire app */}
        <Providers>
          {/* Main content */}
          {children}
        </Providers>
      </body>
    </html>
  );
}

