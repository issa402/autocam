'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Photo } from '@/types';
import { useAuthStore } from '@/stores/auth-store';

interface PhotoEditorProps {
  photo: Photo;
  onSave: (croppedImageUrl: string) => void;
  onCancel: () => void;
}

const ASPECT_RATIOS = [
  { label: 'Free', value: null },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: '3:2', value: 3 / 2 },
  { label: '9:16', value: 9 / 16 },
];

interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function PhotoEditor({ photo, onSave, onCancel }: PhotoEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(16 / 9);
  const [isSaving, setIsSaving] = useState(false);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: CroppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setIsSaving(true);
    try {
      // Create canvas and crop the image
      const image = new Image();
      image.crossOrigin = 'anonymous'; // Allow cross-origin image loading
      image.src = photo.originalUrl || photo.thumbnailSmallUrl || '';

      image.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Set canvas dimensions to cropped area
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        // Draw cropped image
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        // Convert canvas to blob using Promise-based approach
        try {
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => {
              resolve(blob);
            }, 'image/jpeg', 0.95);
          });

          if (!blob) {
            throw new Error('Failed to create blob from canvas');
          }

          const formData = new FormData();
          formData.append('file', blob, `${photo.id}_cropped.jpg`);
          formData.append('photoId', photo.id);

          const { accessToken } = useAuthStore.getState();
          const response = await fetch('/api/photos/crop', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to save cropped image');
          }

          const data = await response.json();
          onSave(data.croppedUrl);
        } catch (error) {
          console.error('Error saving cropped image:', error);
          alert('Failed to save cropped image. Please try again.');
          setIsSaving(false);
        }
      };

      image.onerror = () => {
        console.error('Failed to load image');
        setIsSaving(false);
      };
    } catch (error) {
      console.error('Error cropping image:', error);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Crop Photo: {photo.filename}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Aspect Ratio Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Aspect Ratio
            </label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.label}
                  onClick={() => setAspectRatio(ratio.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    aspectRatio === ratio.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cropper */}
          <div className="relative w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-6">
            <Cropper
              image={photo.originalUrl || photo.thumbnailSmallUrl || ''}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio || undefined}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          {/* Zoom Slider */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zoom: {(zoom * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="px-6 py-2 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Crop'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

