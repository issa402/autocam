/**
 * Project Detail Page
 *
 * This is THE MAIN PAGE where photographers:
 * - View all photos in a project (3-SET WORKFLOW!)
 * - See AI blur detection results
 * - Switch between BLURRY, CLEAN, and FINAL sets
 * - Select photos using KEYBOARD SHORTCUTS
 * - Filter and sort photos
 * - Export selected photos (FINAL set only)
 *
 * CRITICAL: 3-Set Workflow
 * - BLURRY SET: Photos AI marked as blurry (user can rescue good ones)
 * - CLEAN SET: Photos AI marked as clean (user selects keepers)
 * - FINAL SET: Photos user selected from BLURRY or CLEAN (ready for upload)
 *
 * This is the CORE of AutoCam!
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore, useAuthHydration } from '@/stores/auth-store';
import { usePhotoStore } from '@/stores/photo-store';
import { useQuery } from '@tanstack/react-query';
import { Photo } from '@/types';
import PhotoGrid from '@/components/PhotoGrid';
import PhotoFilters from '@/components/PhotoFilters';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import SocialMediaExport from '@/components/SocialMediaExport';
import PhotoSetTabs from '@/components/PhotoSetTabs'; // CRITICAL: 3-set workflow tabs
import { fetchWithAuth } from '@/lib/api-client';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { isAuthenticated, accessToken } = useAuthStore();
  const isHydrated = useAuthHydration();
  const { setPhotos, selectedIds, getSelectedPhotos, getPhotosBySet, currentSet, setCurrentSet } = usePhotoStore();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect if not authenticated (only after hydration)
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Check if we should reopen export modal after OAuth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('success') === 'Google Photos connected successfully') {
      setShowExportModal(true);
      // Clean up the URL
      window.history.replaceState({}, '', `/project/${projectId}`);
    }
  }, [projectId]);

  /**
   * Fetch photos for this project
   * Auto-refetch every 2 seconds to show newly analyzed photos
   */
  const { data: photos, isLoading, error, refetch } = useQuery({
    queryKey: ['photos', projectId],
    queryFn: async () => {
      console.log('🔄 Fetching photos for project:', projectId);
      const response = await fetchWithAuth(`/api/photos?projectId=${projectId}`);

      if (!response.ok) {
        console.error('❌ API Error:', response.status, response.statusText);
        throw new Error('Failed to fetch photos');
      }

      const data = await response.json();
      console.log('✅ Fetched', data.data?.length || 0, 'photos');

      // Convert date strings to Date objects
      const photosWithDates = data.data.map((photo: any) => ({
        ...photo,
        createdAt: new Date(photo.createdAt),
        analyzedAt: photo.analyzedAt ? new Date(photo.analyzedAt) : null,
      }));

      return photosWithDates as Photo[];
    },
    enabled: isAuthenticated && !!projectId,
    refetchInterval: 2000, // Auto-refetch every 2 seconds
    refetchIntervalInBackground: true, // Keep refetching even when tab is not focused
    staleTime: 0, // Data is immediately stale - always refetch
    gcTime: 0, // Don't cache data
  });

  // Update store when photos are loaded
  useEffect(() => {
    if (photos) {
      setPhotos(photos);
    }
  }, [photos, setPhotos]);

  // Handle project deletion
  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
      setIsDeleting(false);
    }
  };

  if (!isHydrated || !isAuthenticated) {
    return null; // Will redirect or still hydrating
  }

  // Calculate FINAL set count for export button
  const finalSetPhotos = photos?.filter(p => p.photoSet === 'FINAL') || [];
  const finalSetCount = finalSetPhotos.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Back button and title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Project Photos
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {photos?.length || 0} photos • {selectedIds.size} selected
                </p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                ⌨️ Shortcuts
              </button>
              
              <button
                onClick={() => router.push(`/project/${projectId}/import`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Import photos from multiple sources"
              >
                📥 Import Photos
              </button>
              
              <button
                onClick={() => setShowExportModal(true)}
                disabled={finalSetCount === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Export ${finalSetCount} photos from FINAL set`}
              >
                📤 Export FINAL Set ({finalSetCount})
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Delete this project and all photos"
              >
                🗑️ Delete Project
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CRITICAL: 3-Set Workflow Tabs */}
      {/* This allows users to switch between BLURRY, CLEAN, and FINAL sets */}
      <PhotoSetTabs />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <PhotoFilters />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="spinner w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading photos...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
            Failed to load photos. Please try again.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && photos?.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📷</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No photos yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upload photos to get started with AI analysis
            </p>
            <button
              onClick={() => router.push(`/project/${projectId}/upload`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Upload Photos
            </button>
          </div>
        )}

        {/* Photo Grid */}
        {!isLoading && !error && photos && photos.length > 0 && (
          <PhotoGrid />
        )}
      </main>

      {/* Export Modal */}
      {showExportModal && (
        <SocialMediaExport
          photos={finalSetPhotos}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Delete Project?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete this project and all {photos?.length || 0} photos. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

