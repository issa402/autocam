/**
 * PhotoSetTabs Component
 * 
 * CRITICAL: This implements the 3-SET WORKFLOW
 * 
 * 3 Tabs:
 * 1. BLURRY SET - Photos AI marked as blurry (user can review and rescue)
 * 2. CLEAN SET - Photos AI marked as clean (user selects keepers)
 * 3. FINAL SET - Photos user selected from BLURRY or CLEAN (ready for upload)
 * 
 * Workflow:
 * - User clicks tab to switch between sets
 * - Each tab shows count of photos in that set
 * - Active tab is highlighted
 * - Clicking tab updates currentSet in store
 * 
 * Why separate component?
 * - Reusable across pages
 * - Clean separation of concerns
 * - Easy to style and maintain
 */

'use client';

import { useState } from 'react';
import { usePhotoStore } from '@/stores/photo-store';
import { PhotoSet } from '@/types';
import SocialMediaExport from './SocialMediaExport';

/**
 * PhotoSetTabs Component
 * Displays tabs for switching between BLURRY, CLEAN, and FINAL sets
 */
export default function PhotoSetTabs() {
  const [showExportModal, setShowExportModal] = useState(false);

  // Get state from photo store
  const currentSet = usePhotoStore((state) => state.currentSet);
  const setCurrentSet = usePhotoStore((state) => state.setCurrentSet);
  const getPhotosBySet = usePhotoStore((state) => state.getPhotosBySet);
  const photos = usePhotoStore((state) => state.photos);
  
  // Calculate counts for each set
  const blurryCount = photos.filter(p => p.photoSet === 'BLURRY').length;
  const cleanCount = photos.filter(p => p.photoSet === 'CLEAN').length;
  const finalCount = photos.filter(p => p.photoSet === 'FINAL').length;
  const pendingCount = photos.filter(p => p.photoSet === 'PENDING').length;

  // Debug logging - ALWAYS log to help debug
  console.log('🔍 PhotoSetTabs Update:', {
    totalPhotos: photos.length,
    pendingCount,
    blurryCount,
    cleanCount,
    finalCount,
    currentSet
  });
  if (photos.length > 0) {
    console.log('📸 Sample photos:', photos.slice(0, 3).map(p => ({
      filename: p.filename,
      photoSet: p.photoSet,
      isBlurry: p.isBlurry,
      blurScore: p.blurScore,
      analyzedAt: p.analyzedAt ? '✅ Analyzed' : '⏳ Pending'
    })));
  }
  
  /**
   * Tab configuration
   * Each tab has:
   * - id: PhotoSet value
   * - label: Display name
   * - count: Number of photos in set
   * - description: What this set is for
   * - color: Tailwind color class
   */
  const tabs = [
    {
      id: 'PENDING' as PhotoSet,
      label: 'Pending',
      count: pendingCount,
      description: 'Being analyzed by AI...',
      color: 'yellow',
      icon: '⏳',
    },
    {
      id: 'BLURRY' as PhotoSet,
      label: 'Blurry Set',
      count: blurryCount,
      description: 'Review and rescue good photos',
      color: 'red',
      icon: '🔴',
    },
    {
      id: 'CLEAN' as PhotoSet,
      label: 'Clean Set',
      count: cleanCount,
      description: 'Select keepers from sharp photos',
      color: 'green',
      icon: '✅',
    },
    {
      id: 'FINAL' as PhotoSet,
      label: 'Final Set',
      count: finalCount,
      description: 'Ready for upload',
      color: 'blue',
      icon: '🚀',
    },
  ];
  
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Tabs */}
      <div className="flex gap-1 px-4">
        {tabs.map((tab) => {
          const isActive = currentSet === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentSet(tab.id)}
              className={`
                relative px-6 py-4 font-medium text-sm transition-all
                border-b-2 hover:bg-gray-50 dark:hover:bg-gray-800
                ${
                  isActive
                    ? `border-${tab.color}-500 text-${tab.color}-600 dark:text-${tab.color}-400 bg-${tab.color}-50 dark:bg-${tab.color}-900/20`
                    : 'border-transparent text-gray-600 dark:text-gray-400'
                }
              `}
            >
              {/* Tab content */}
              <div className="flex items-center gap-3">
                {/* Icon */}
                <span className="text-xl">{tab.icon}</span>
                
                {/* Label and count */}
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span>{tab.label}</span>
                    <span
                      className={`
                        px-2 py-0.5 rounded-full text-xs font-bold
                        ${
                          isActive
                            ? `bg-${tab.color}-100 dark:bg-${tab.color}-900 text-${tab.color}-700 dark:text-${tab.color}-300`
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }
                      `}
                    >
                      {tab.count}
                    </span>
                  </div>
                  
                  {/* Description (only show on active tab) */}
                  {isActive && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {tab.description}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${tab.color}-500`} />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Instructions based on current set */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        {currentSet === 'PENDING' && (
          <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-yellow-500 animate-spin">⏳</span>
            <div>
              <strong>Pending Set:</strong> Your photos are being analyzed by AI.
              This usually takes a few seconds per photo. Once analysis is complete, photos will move to the Blurry or Clean set.
            </div>
          </div>
        )}

        {currentSet === 'BLURRY' && (
          <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-red-500">💡</span>
            <div>
              <strong>Blurry Set:</strong> These photos were marked as blurry by AI. 
              Review them and press <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">A</kbd> to rescue any good ones.
              Selected photos will be added to the Final Set.
            </div>
          </div>
        )}
        
        {currentSet === 'CLEAN' && (
          <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-green-500">💡</span>
            <div>
              <strong>Clean Set:</strong> These photos are sharp and ready to review. 
              Press <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">A</kbd> to select keepers.
              Selected photos will be added to the Final Set.
            </div>
          </div>
        )}
        
        {currentSet === 'FINAL' && (
          <div className="flex items-start justify-between gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="text-blue-500">💡</span>
              <div>
                <strong>Final Set:</strong> These are your selected photos ready for upload.
                Click the <strong>Export</strong> button to automatically upload them to Google Drive, Facebook, or download as ZIP.
              </div>
            </div>
            {finalCount > 0 && (
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg whitespace-nowrap transition-colors"
              >
                📤 Export ({finalCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Social Media Export Modal */}
      {showExportModal && (
        <SocialMediaExport
          photos={photos.filter((p) => p.photoSet === 'FINAL')}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

