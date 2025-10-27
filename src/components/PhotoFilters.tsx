/**
 * Photo Filters Component
 * 
 * This component provides filtering and sorting controls:
 * - Show/hide blurry photos
 * - Show/hide selected photos
 * - Minimum quality score filter
 * - Sort by quality, time, name, size
 * - Sort order (ascending/descending)
 */

'use client';

import { usePhotoStore } from '@/stores/photo-store';

export default function PhotoFilters() {
  const {
    filters,
    sortBy,
    sortOrder,
    setFilters,
    setSortBy,
    setSortOrder,
  } = usePhotoStore();

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Show Blurry toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.showBlurry}
          onChange={(e) => setFilters({ showBlurry: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Show Blurry
        </span>
      </label>

      {/* Show Selected toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.showSelected}
          onChange={(e) => setFilters({ showSelected: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Show Selected
        </span>
      </label>

      {/* Minimum Quality Score */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Min Quality:
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={filters.minQualityScore || ''}
          onChange={(e) => setFilters({
            minQualityScore: e.target.value ? parseFloat(e.target.value) : undefined
          })}
          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          placeholder="0"
        />
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>

      {/* Sort By */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Sort by:
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
        >
          <option value="time">Time</option>
          <option value="quality">Quality</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
      </div>

      {/* Sort Order */}
      <button
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
      >
        {sortOrder === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
}

