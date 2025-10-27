/**
 * Photo Upload Sources Component
 * 
 * CRITICAL: Supports ALL photo input methods!
 * 
 * This component provides multiple ways to import photos:
 * 1. Computer Files - Drag-drop or file picker (IMPLEMENTED)
 * 2. Camera Card - SD card, CF card reader (TODO)
 * 3. USB Drive - External hard drive, USB flash drive (TODO)
 * 4. Google Drive - Cloud storage picker (TODO)
 * 5. Dropbox - Cloud storage picker (TODO)
 * 6. Direct Camera - USB tethering, WiFi transfer (TODO)
 * 
 * Why multiple sources?
 * - Photographers use different workflows
 * - Some shoot to camera card, some to USB drive
 * - Some backup to cloud storage
 * - Some use tethered shooting
 * 
 * This makes AutoCam work with ANY photographer's workflow!
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PhotoUploadSourcesProps {
  projectId: string;
}

export default function PhotoUploadSources({ projectId }: PhotoUploadSourcesProps) {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  /**
   * Upload source options
   * Each source has:
   * - id: Unique identifier
   * - name: Display name
   * - description: What this source is for
   * - icon: Emoji icon
   * - status: 'available', 'coming_soon', 'implemented'
   * - onClick: Handler function
   */
  const sources = [
    {
      id: 'computer',
      name: 'Upload from Computer',
      description: 'Drag & drop or browse files from your computer',
      icon: '💻',
      status: 'implemented' as const,
      onClick: () => {
        // Navigate to existing upload page
        router.push(`/project/${projectId}/upload`);
      },
    },
    {
      id: 'camera-card',
      name: 'Import from Camera Card',
      description: 'Read photos directly from SD card or CF card',
      icon: '📷',
      status: 'coming_soon' as const,
      onClick: () => {
        alert('Camera card import coming soon! This will use the File System Access API to read directly from your SD/CF card.');
      },
    },
    {
      id: 'usb-drive',
      name: 'Import from USB Drive',
      description: 'Import from external hard drive or USB flash drive',
      icon: '💾',
      status: 'coming_soon' as const,
      onClick: () => {
        alert('USB drive import coming soon! This will use the File System Access API to read from any USB storage device.');
      },
    },
    {
      id: 'google-drive',
      name: 'Import from Google Drive',
      description: 'Select photos from your Google Drive',
      icon: '☁️',
      status: 'coming_soon' as const,
      onClick: () => {
        alert('Google Drive import coming soon! This will use the Google Drive Picker API to select photos from your cloud storage.');
      },
    },
    {
      id: 'dropbox',
      name: 'Import from Dropbox',
      description: 'Select photos from your Dropbox',
      icon: '📦',
      status: 'coming_soon' as const,
      onClick: () => {
        alert('Dropbox import coming soon! This will use the Dropbox Chooser API to select photos from your cloud storage.');
      },
    },
    {
      id: 'direct-camera',
      name: 'Connect Camera Directly',
      description: 'USB tethering or WiFi transfer from camera',
      icon: '📸',
      status: 'coming_soon' as const,
      onClick: () => {
        alert('Direct camera connection coming soon! This will support USB tethering and WiFi transfer from Canon, Nikon, Sony cameras.');
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Import Photos
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Choose how you want to import your photos
          </p>
        </div>

        {/* Source options grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={source.onClick}
              disabled={source.status === 'coming_soon'}
              className={`
                relative p-6 rounded-xl border-2 transition-all text-left
                ${
                  source.status === 'implemented'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer'
                    : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60 cursor-not-allowed'
                }
                ${selectedSource === source.id ? 'ring-4 ring-blue-300' : ''}
              `}
            >
              {/* Status badge */}
              {source.status === 'coming_soon' && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-bold rounded-full">
                  Coming Soon
                </div>
              )}
              
              {source.status === 'implemented' && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-bold rounded-full">
                  Available
                </div>
              )}

              {/* Icon */}
              <div className="text-5xl mb-4">{source.icon}</div>

              {/* Name */}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {source.name}
              </h3>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400">
                {source.description}
              </p>
            </button>
          ))}
        </div>

        {/* Info section */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                Why Multiple Import Options?
              </h3>
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                Every photographer has a different workflow. Some shoot to camera cards, 
                some to USB drives, some backup to cloud storage, and some use tethered shooting. 
                AutoCam works with <strong>ALL</strong> workflows so you can import photos 
                however you prefer!
              </p>
            </div>
          </div>
        </div>

        {/* Technical details (for developers) */}
        <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">
            🔧 Technical Implementation
          </h3>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <strong>Computer Files:</strong> Uses HTML5 File API with drag-drop support
            </div>
            <div>
              <strong>Camera Card / USB Drive:</strong> Will use File System Access API 
              (Chrome 86+) to read directly from storage devices
            </div>
            <div>
              <strong>Google Drive:</strong> Will use Google Drive Picker API with OAuth 2.0
            </div>
            <div>
              <strong>Dropbox:</strong> Will use Dropbox Chooser API
            </div>
            <div>
              <strong>Direct Camera:</strong> Will use WebUSB API for USB tethering, 
              and camera manufacturer SDKs (Canon SDK, Nikon SDK, Sony SDK) for WiFi transfer
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push(`/project/${projectId}`)}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            ← Back to Project
          </button>
        </div>
      </div>
    </div>
  );
}

