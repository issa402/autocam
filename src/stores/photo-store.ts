/**
 * Photo Store (Zustand)
 *
 * This is the global state management for photos with 3-SET WORKFLOW.
 *
 * CRITICAL: 3-Set Workflow
 * 1. Upload photos → PENDING set
 * 2. AI analyzes → assigns to BLURRY or CLEAN set
 * 3. User reviews BLURRY set (optional) → selects photos to rescue → adds to FINAL set
 * 4. User reviews CLEAN set → selects keepers → adds to FINAL set
 * 5. Export uploads all photos in FINAL set
 *
 * Why Zustand?
 * - Simple API (easier than Redux)
 * - No boilerplate
 * - TypeScript support
 * - DevTools integration
 * - Persistent state (localStorage)
 *
 * What it stores:
 * - List of photos
 * - Selected photo IDs
 * - Current photo index (for keyboard navigation)
 * - Current set (BLURRY, CLEAN, or FINAL)
 * - Filters (show blurry, show selected, etc.)
 * - Sort settings
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Photo, PhotoFilters, PhotoSortBy, SortOrder, PhotoSet } from '@/types';

/**
 * Photo store state interface
 */
interface PhotoState {
  // Data
  photos: Photo[];
  selectedIds: Set<string>;
  currentPhotoIndex: number;

  // CRITICAL: Current set being viewed (BLURRY, CLEAN, or FINAL)
  currentSet: PhotoSet;

  // Filters
  filters: PhotoFilters;
  sortBy: PhotoSortBy;
  sortOrder: SortOrder;
  
  // Actions - Photo Management
  setPhotos: (photos: Photo[]) => void;
  addPhoto: (photo: Photo) => void;
  updatePhoto: (id: string, updates: Partial<Photo>) => void;
  removePhoto: (id: string) => void;
  
  // Actions - Selection
  toggleSelection: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  deselectMultiple: (ids: string[]) => void;
  selectAll: () => void;
  deselectAll: () => void;
  
  // Actions - Navigation
  setCurrentPhotoIndex: (index: number) => void;
  nextPhoto: () => void;
  prevPhoto: () => void;
  
  // Actions - Filters
  setFilters: (filters: Partial<PhotoFilters>) => void;
  setSortBy: (sortBy: PhotoSortBy) => void;
  setSortOrder: (order: SortOrder) => void;

  // Actions - Set Management (CRITICAL!)
  setCurrentSet: (set: PhotoSet) => void;

  // Computed
  getFilteredPhotos: () => Photo[];
  getCurrentPhoto: () => Photo | null;
  getSelectedPhotos: () => Photo[];
  getPhotosBySet: (set: PhotoSet) => Photo[];
}

/**
 * Create photo store
 */
export const usePhotoStore = create<PhotoState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        photos: [],
        selectedIds: new Set<string>(),
        currentPhotoIndex: 0,

        // CRITICAL: Start with CLEAN set (most common workflow)
        currentSet: 'CLEAN' as PhotoSet,

        filters: {
          showBlurry: true,
          showSelected: true,
        },
        sortBy: 'time',
        sortOrder: 'desc',
        
        // ============================================
        // Photo Management Actions
        // ============================================
        
        /**
         * Sets the entire photos array
         * Used when loading photos from API
         */
        setPhotos: (photos) => set({ photos, currentPhotoIndex: 0 }),
        
        /**
         * Adds a single photo
         * Used when uploading new photos
         */
        addPhoto: (photo) => set((state) => ({
          photos: [...state.photos, photo],
        })),
        
        /**
         * Updates a photo's properties
         * Used when AI analysis completes
         */
        updatePhoto: (id, updates) => set((state) => ({
          photos: state.photos.map((photo) =>
            photo.id === id ? { ...photo, ...updates } : photo
          ),
        })),
        
        /**
         * Removes a photo
         */
        removePhoto: (id) => set((state) => ({
          photos: state.photos.filter((photo) => photo.id !== id),
          selectedIds: new Set(
            Array.from(state.selectedIds).filter((selectedId) => selectedId !== id)
          ),
        })),
        
        // ============================================
        // Selection Actions
        // ============================================
        
        /**
         * Toggles selection of a photo
         * If selected, deselect. If deselected, select.
         */
        toggleSelection: (id) => set((state) => {
          const newSelectedIds = new Set(state.selectedIds);
          
          if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
          } else {
            newSelectedIds.add(id);
          }
          
          return { selectedIds: newSelectedIds };
        }),
        
        /**
         * Selects multiple photos
         */
        selectMultiple: (ids) => set((state) => {
          const newSelectedIds = new Set(state.selectedIds);
          ids.forEach((id) => newSelectedIds.add(id));
          return { selectedIds: newSelectedIds };
        }),
        
        /**
         * Deselects multiple photos
         */
        deselectMultiple: (ids) => set((state) => {
          const newSelectedIds = new Set(state.selectedIds);
          ids.forEach((id) => newSelectedIds.delete(id));
          return { selectedIds: newSelectedIds };
        }),
        
        /**
         * Selects all filtered photos
         */
        selectAll: () => set((state) => {
          const filteredPhotos = get().getFilteredPhotos();
          const newSelectedIds = new Set(state.selectedIds);
          filteredPhotos.forEach((photo) => newSelectedIds.add(photo.id));
          return { selectedIds: newSelectedIds };
        }),
        
        /**
         * Deselects all photos
         */
        deselectAll: () => set({ selectedIds: new Set() }),
        
        // ============================================
        // Navigation Actions
        // ============================================
        
        /**
         * Sets current photo index
         */
        setCurrentPhotoIndex: (index) => set({ currentPhotoIndex: index }),
        
        /**
         * Moves to next photo
         */
        nextPhoto: () => set((state) => {
          const filteredPhotos = get().getFilteredPhotos();
          const maxIndex = filteredPhotos.length - 1;
          return {
            currentPhotoIndex: Math.min(state.currentPhotoIndex + 1, maxIndex),
          };
        }),
        
        /**
         * Moves to previous photo
         */
        prevPhoto: () => set((state) => ({
          currentPhotoIndex: Math.max(state.currentPhotoIndex - 1, 0),
        })),
        
        // ============================================
        // Filter Actions
        // ============================================
        
        /**
         * Updates filters
         */
        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters },
          currentPhotoIndex: 0, // Reset to first photo when filters change
        })),
        
        /**
         * Sets sort field
         */
        setSortBy: (sortBy) => set({ sortBy }),
        
        /**
         * Sets sort order
         */
        setSortOrder: (order) => set({ sortOrder: order }),

        // ============================================
        // Set Management Actions (CRITICAL!)
        // ============================================

        /**
         * Sets current set (BLURRY, CLEAN, or FINAL)
         * This determines which photos are shown in the grid
         */
        setCurrentSet: (currentSet) => set({
          currentSet,
          currentPhotoIndex: 0, // Reset to first photo when switching sets
        }),

        // ============================================
        // Computed Values
        // ============================================
        
        /**
         * Gets filtered and sorted photos for the CURRENT SET
         * CRITICAL: This filters by currentSet (BLURRY, CLEAN, or FINAL)
         */
        getFilteredPhotos: () => {
          const state = get();
          let filtered = [...state.photos];

          // CRITICAL: Filter by current set first!
          filtered = filtered.filter((photo) => photo.photoSet === state.currentSet);

          // Apply additional filters
          // IMPORTANT: Don't hide blurry photos when viewing BLURRY tab!
          // Only apply showBlurry filter when viewing CLEAN or FINAL sets
          if (!state.filters.showBlurry && state.currentSet !== 'BLURRY') {
            filtered = filtered.filter((photo) => !photo.isBlurry);
          }

          if (state.filters.minQualityScore !== undefined) {
            filtered = filtered.filter(
              (photo) =>
                photo.qualityScore !== null &&
                photo.qualityScore >= state.filters.minQualityScore!
            );
          }

          if (state.filters.hasFaces !== undefined) {
            filtered = filtered.filter(
              (photo) => photo.hasFaces === state.filters.hasFaces
            );
          }

          // Apply sorting
          filtered.sort((a, b) => {
            let comparison = 0;

            switch (state.sortBy) {
              case 'quality':
                comparison = (a.qualityScore || 0) - (b.qualityScore || 0);
                break;
              case 'time':
                comparison = a.createdAt.getTime() - b.createdAt.getTime();
                break;
              case 'name':
                comparison = a.filename.localeCompare(b.filename);
                break;
              case 'size':
                comparison = Number(a.fileSize) - Number(b.fileSize);
                break;
            }

            return state.sortOrder === 'asc' ? comparison : -comparison;
          });

          return filtered;
        },
        
        /**
         * Gets current photo
         */
        getCurrentPhoto: () => {
          const filteredPhotos = get().getFilteredPhotos();
          return filteredPhotos[get().currentPhotoIndex] || null;
        },
        
        /**
         * Gets selected photos
         */
        getSelectedPhotos: () => {
          const state = get();
          return state.photos.filter((photo) => state.selectedIds.has(photo.id));
        },

        /**
         * Gets photos by set (PENDING, BLURRY, CLEAN, or FINAL)
         * Used for displaying counts in tabs
         */
        getPhotosBySet: (photoSet) => {
          const state = get();
          return state.photos.filter((photo) => photo.photoSet === photoSet);
        },
      }),
      {
        name: 'photo-store', // localStorage key
        // Don't persist photos (too large), only persist filters and selections
        partialize: (state) => ({
          filters: state.filters,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
        }),
      }
    )
  )
);

