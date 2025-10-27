/**
 * Photo Grid Component
 *
 * This is the MAIN component for photo selection with 3-SET WORKFLOW.
 *
 * CRITICAL: 3-Set Workflow
 * - When in BLURRY or CLEAN set: Pressing 'A' moves photo to FINAL set
 * - When in FINAL set: Pressing 'A' removes photo from FINAL set
 * - This is the CORE of the selection workflow!
 *
 * Features:
 * - Virtualized grid (60 FPS with 1000+ photos)
 * - Keyboard shortcuts (A, arrows, space, etc.)
 * - Visual indicators (selected, blurry, active)
 * - Quality scores
 * - Click to select
 * - API integration for moving photos between sets
 *
 * Why virtualization?
 * - Only renders visible photos
 * - Maintains 60 FPS with thousands of photos
 * - Reduces memory usage
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePhotoStore } from '@/stores/photo-store';
import { useHotkeys } from 'react-hotkeys-hook';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Photo } from '@/types';
import { cn, getQualityColor } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import PhotoEditor from './PhotoEditor';

/**
 * Photo Card Component
 * 
 * Displays a single photo with:
 * - Thumbnail
 * - Selection indicator
 * - Blur indicator
 * - Quality score
 * - Active state (keyboard focus)
 */
function PhotoCard({ photo, isSelected, isActive, onClick, onEdit }: {
  photo: Photo;
  isSelected: boolean;
  isActive: boolean;
  onClick: () => void;
  onEdit?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll into view when active
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isActive]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={cn(
        'relative aspect-square cursor-pointer rounded-lg overflow-hidden transition-all',
        'hover:scale-105 hover:shadow-xl',
        isSelected && 'ring-4 ring-green-500',
        isActive && 'ring-4 ring-blue-500',
        photo.isBlurry && 'opacity-60'
      )}
    >
      {/* Photo thumbnail */}
      <img
        src={photo.thumbnailSmallUrl || photo.originalUrl}
        alt={photo.filename}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      
      {/* Overlay with info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-between">
        <div className="absolute top-0 left-0 right-0 p-2 flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
              title="Edit photo (crop)"
            >
              ✏️ Edit
            </button>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-medium truncate">
            {photo.filename}
          </p>
        </div>
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
          ✓
        </div>
      )}
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
          →
        </div>
      )}
      
      {/* Blur indicator */}
      {photo.isBlurry && (
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
          BLURRY
        </div>
      )}
      
      {/* Quality score */}
      {photo.qualityScore !== null && (
        <div className={cn(
          'absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-bold',
          getQualityColor(photo.qualityScore)
        )}>
          {Math.round(photo.qualityScore)}
        </div>
      )}
      
      {/* Processing indicator */}
      {!photo.analyzedAt && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="spinner w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Photo Grid Component
 */
export default function PhotoGrid() {
  const {
    getFilteredPhotos,
    currentPhotoIndex,
    selectedIds,
    toggleSelection,
    nextPhoto,
    prevPhoto,
    selectAll,
    deselectAll,
    setCurrentPhotoIndex,
    currentSet, // CRITICAL: Which set user is viewing
    updatePhoto, // To update photo locally after API call
  } = usePhotoStore();

  const { accessToken } = useAuthStore();
  const [isMoving, setIsMoving] = useState(false); // Loading state for API calls
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null); // Photo being edited

  const filteredPhotos = getFilteredPhotos();
  const currentPhoto = filteredPhotos[currentPhotoIndex];
  const editingPhoto = filteredPhotos.find(p => p.id === editingPhotoId);

  /**
   * CRITICAL: Move photo to FINAL set (or remove from FINAL)
   *
   * This is the CORE of the 3-set workflow!
   *
   * - If in BLURRY or CLEAN set: Move photo to FINAL set
   * - If in FINAL set: Remove photo from FINAL set (move back to original)
   *
   * Why async?
   * - Calls API to update database
   * - Updates local state after success
   * - Shows error if fails
   */
  const moveToFinalSet = async (photoId: string) => {
    if (isMoving) return; // Prevent multiple simultaneous calls

    setIsMoving(true);

    try {
      if (currentSet === 'FINAL') {
        // Remove from FINAL set (move back to original set)
        const response = await fetch('/api/photos/move-to-final', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ photoIds: [photoId] }),
        });

        if (!response.ok) {
          throw new Error('Failed to remove from FINAL set');
        }

        const data = await response.json();
        console.log('Removed from FINAL set:', data);

        // Update local state - photo moves back to BLURRY or CLEAN
        const photo = filteredPhotos.find(p => p.id === photoId);
        if (photo) {
          const originalSet = photo.isBlurry ? 'BLURRY' : 'CLEAN';
          updatePhoto(photoId, { photoSet: originalSet, isSelected: false });
        }

      } else if (currentSet === 'BLURRY' || currentSet === 'CLEAN') {
        // Move to FINAL set
        const response = await fetch('/api/photos/move-to-final', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ photoIds: [photoId] }),
        });

        if (!response.ok) {
          throw new Error('Failed to move to FINAL set');
        }

        const data = await response.json();
        console.log('Moved to FINAL set:', data);

        // Update local state - photo moves to FINAL
        updatePhoto(photoId, { photoSet: 'FINAL', isSelected: true });
      }

    } catch (error) {
      console.error('Error moving photo:', error);
      alert('Failed to update photo. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  /**
   * Keyboard Shortcuts
   *
   * A - Select current photo and move to FINAL set (or remove if already in FINAL)
   * Space - Toggle selection of current photo
   * Right Arrow - Next photo
   * Left Arrow - Previous photo
   * Ctrl+A - Select all
   * Ctrl+D - Deselect all
   */

  // A key - CRITICAL: Move to FINAL set and move to next photo
  useHotkeys('a', async () => {
    if (currentPhoto && !isMoving) {
      await moveToFinalSet(currentPhoto.id);
      nextPhoto();
    }
  }, [currentPhoto, currentSet, isMoving]);

  // Space - Toggle selection (same as 'A' but doesn't move to next)
  useHotkeys('space', async (e) => {
    e.preventDefault();
    if (currentPhoto && !isMoving) {
      await moveToFinalSet(currentPhoto.id);
    }
  }, [currentPhoto, currentSet, isMoving]);

  // Arrow keys - Navigation
  useHotkeys('right', () => nextPhoto(), []);
  useHotkeys('left', () => prevPhoto(), []);
  useHotkeys('down', () => {
    // Move down one row (assuming 4 columns)
    const newIndex = Math.min(currentPhotoIndex + 4, filteredPhotos.length - 1);
    setCurrentPhotoIndex(newIndex);
  }, [currentPhotoIndex, filteredPhotos.length]);
  useHotkeys('up', () => {
    // Move up one row
    const newIndex = Math.max(currentPhotoIndex - 4, 0);
    setCurrentPhotoIndex(newIndex);
  }, [currentPhotoIndex]);

  // Ctrl+A - Select all
  useHotkeys('ctrl+a, cmd+a', (e) => {
    e.preventDefault();
    selectAll();
  }, []);

  // Ctrl+D - Deselect all
  useHotkeys('ctrl+d, cmd+d', (e) => {
    e.preventDefault();
    deselectAll();
  }, []);

  /**
   * Handle photo click
   * CRITICAL: Clicking a photo moves it to/from FINAL set
   */
  const handlePhotoClick = async (photo: Photo, index: number) => {
    setCurrentPhotoIndex(index);
    if (!isMoving) {
      await moveToFinalSet(photo.id);
    }
  };

  /**
   * Grid cell renderer
   * 
   * This is called by react-window for each visible cell
   */
  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const COLUMNS = 4; // Number of columns
    const index = rowIndex * COLUMNS + columnIndex;
    
    if (index >= filteredPhotos.length) {
      return null;
    }
    
    const photo = filteredPhotos[index];
    const isSelected = selectedIds.has(photo.id);
    const isActive = index === currentPhotoIndex;
    
    return (
      <div style={style} className="p-2">
        <PhotoCard
          photo={photo}
          isSelected={isSelected}
          isActive={isActive}
          onClick={() => handlePhotoClick(photo, index)}
          onEdit={() => setEditingPhotoId(photo.id)}
        />
      </div>
    );
  };

  // Calculate grid dimensions
  const COLUMNS = 4;
  const COLUMN_WIDTH = 250;
  const ROW_HEIGHT = 250;
  const rows = Math.ceil(filteredPhotos.length / COLUMNS);

  return (
    <div className="h-[calc(100vh-300px)]">
      {/* Keyboard shortcuts hint */}
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <strong>Keyboard Shortcuts:</strong>{' '}
          <span className="kbd">A</span> Select & Next •{' '}
          <span className="kbd">Space</span> Toggle •{' '}
          <span className="kbd">←→</span> Navigate •{' '}
          <span className="kbd">Ctrl+A</span> Select All
        </p>
      </div>

      {/* Virtualized grid */}
      <AutoSizer>
        {({ height, width }) => (
          <Grid
            columnCount={COLUMNS}
            columnWidth={COLUMN_WIDTH}
            height={height}
            rowCount={rows}
            rowHeight={ROW_HEIGHT}
            width={width}
          >
            {Cell}
          </Grid>
        )}
      </AutoSizer>

      {/* Photo Editor Modal */}
      {editingPhoto && (
        <PhotoEditor
          photo={editingPhoto}
          onSave={(croppedUrl) => {
            // Update photo with cropped URL
            updatePhoto(editingPhoto.id, { originalUrl: croppedUrl });
            setEditingPhotoId(null);
          }}
          onCancel={() => setEditingPhotoId(null)}
        />
      )}
    </div>
  );
}

