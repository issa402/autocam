/**
 * Home Page
 * 
 * This is the landing page of the application.
 * 
 * For authenticated users: Redirects to dashboard
 * For guests: Shows login/register options
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        {/* Logo/Title */}
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
          📸 AutoCam
        </h1>
        
        {/* Tagline */}
        <p className="text-2xl text-gray-600 dark:text-gray-300 mb-8">
          Automated Photo Management for Sports Photographers
        </p>
        
        {/* Description */}
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
          Upload hundreds of photos, let AI detect blurry shots, select the best ones with keyboard shortcuts,
          and export to Google Drive or Facebook in minutes. Save hours of manual work.
        </p>
        
        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI Blur Detection</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Automatically identifies blurry photos so you can focus on the good ones
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">⌨️</div>
            <h3 className="text-xl font-semibold mb-2">Keyboard Shortcuts</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Select photos lightning-fast with 'A' key. Navigate with arrow keys
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">☁️</div>
            <h3 className="text-xl font-semibold mb-2">One-Click Export</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Export selected photos to Google Drive, Facebook, or download as ZIP
            </p>
          </div>
        </div>
        
        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/register"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Get Started Free
          </Link>
          
          <Link
            href="/auth/login"
            className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-lg"
          >
            Sign In
          </Link>
        </div>
        
        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">90%</div>
            <div className="text-gray-600 dark:text-gray-400">Time Saved</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">94%</div>
            <div className="text-gray-600 dark:text-gray-400">AI Accuracy</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">15min</div>
            <div className="text-gray-600 dark:text-gray-400">Avg. Workflow</div>
          </div>
        </div>
      </div>
    </div>
  );
}

