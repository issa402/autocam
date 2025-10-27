'use client';

import { useState } from 'react';
import { Photo } from '@/types';
import { useAuthStore } from '@/stores/auth-store';

interface SocialMediaExportProps {
  photos: Photo[];
  onClose: () => void;
}

const SOCIAL_PLATFORMS = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: '📁',
    description: 'Save to your Google Drive',
    color: 'bg-blue-500',
  },
  {
    id: 'google-photos',
    name: 'Google Photos',
    icon: '🖼️',
    description: 'Upload to Google Photos album',
    color: 'bg-green-500',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '👥',
    description: 'Share to Facebook album',
    color: 'bg-blue-600',
  },
];

export default function SocialMediaExport({ photos, onClose }: SocialMediaExportProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [albumName, setAlbumName] = useState<string>('AutoCam');
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(true);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleConnectPlatform = async (platformId: string) => {
    setIsConnecting(platformId);
    try {
      const { accessToken } = useAuthStore.getState();

      if (platformId === 'google-photos') {
        // Auto-select Google Photos when connecting
        if (!selectedPlatforms.includes('google-photos')) {
          setSelectedPlatforms([...selectedPlatforms, 'google-photos']);
        }

        const response = await fetch('/api/oauth/google-photos/login', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      }
    } catch (error) {
      console.error('Connection error:', error);
      setExportStatus('❌ Failed to connect platform');
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnectPlatform = async (platformId: string) => {
    try {
      const { accessToken } = useAuthStore.getState();

      if (platformId === 'google-photos') {
        const response = await fetch('/api/oauth/google-photos/disconnect', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setExportStatus('✅ Disconnected! Click Connect to reconnect with new permissions.');
          setShowSuccessMessage(false);
          // Remove from selected platforms
          setSelectedPlatforms(prev => prev.filter(id => id !== 'google-photos'));
        } else {
          setExportStatus('❌ Failed to disconnect');
        }
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      setExportStatus('❌ Failed to disconnect platform');
    }
  };

  const handleExport = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setIsExporting(true);
    setExportStatus('Preparing export...');

    try {
      const { accessToken } = useAuthStore.getState();

      console.log('Starting export with:', {
        photoCount: photos.length,
        platforms: selectedPlatforms,
        albumName,
      });

      const response = await fetch('/api/photos/export-social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          photoIds: photos.map((p) => p.id),
          platforms: selectedPlatforms,
          albumName,
        }),
      });

      const data = await response.json();
      console.log('Export response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Export failed');
      }

      // Check if Google Photos export was successful
      if (data.results['google-photos']?.status === 'success') {
        const albumUrl = data.results['google-photos'].albumUrl;
        const uploadedCount = data.results['google-photos'].uploadedCount;
        setExportStatus(`✅ Successfully uploaded ${uploadedCount} photo(s) to Google Photos! Opening album...`);

        // Open Google Photos in new tab after showing message
        setTimeout(() => {
          window.open(albumUrl, '_blank');
          // Keep dialog open for 3 more seconds so user sees the success message
          setTimeout(() => {
            onClose();
          }, 3000);
        }, 1000);
      } else if (data.results['google-photos']?.status === 'error') {
        throw new Error(data.results['google-photos'].message);
      } else {
        setExportStatus('✅ Export successful!');
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus(`❌ ${error instanceof Error ? error.message : 'Export failed. Please try again.'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          {showSuccessMessage && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Google Photos Connected!</p>
                <p className="text-sm text-green-800 dark:text-green-200">Now select an album name and click Export</p>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="ml-auto text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              >
                ✕
              </button>
            </div>
          )}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Export {photos.length} Photo{photos.length !== 1 ? 's' : ''}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Choose where to save your photos
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Album Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Album Name (for Google Photos)
            </label>
            <input
              type="text"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              placeholder="e.g., Wedding Photos, Event 2024"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Platform Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div
                key={platform.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPlatforms.includes(platform.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <button
                  onClick={() => togglePlatform(platform.id)}
                  className="w-full text-left hover:opacity-80 transition-opacity"
                >
                  <div className="text-3xl mb-2">{platform.icon}</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {platform.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {platform.description}
                  </p>
                </button>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleConnectPlatform(platform.id)}
                    disabled={isConnecting === platform.id}
                    className="flex-1 px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    {isConnecting === platform.id ? 'Connecting...' : 'Connect'}
                  </button>
                  {platform.id === 'google-photos' && (
                    <button
                      onClick={() => handleDisconnectPlatform(platform.id)}
                      className="px-3 py-1 text-xs rounded bg-red-200 dark:bg-red-900/30 text-red-900 dark:text-red-200 hover:bg-red-300 dark:hover:bg-red-900/50 transition-colors"
                      title="Disconnect and reconnect with new permissions"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status Message */}
          {exportStatus && (
            <div className="mb-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
              <p className="text-gray-900 dark:text-white">{exportStatus}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-6 py-2 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedPlatforms.length === 0}
              className="px-6 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                `Export to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

