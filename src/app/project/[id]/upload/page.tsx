/**
 * Photo Upload Page
 * 
 * This page allows users to upload photos to a project.
 * 
 * Features:
 * - Drag and drop upload
 * - Multiple file selection
 * - Upload progress tracking
 * - File validation (type, size)
 * - Automatic AI analysis after upload
 */

'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useDropzone } from 'react-dropzone';
import { isValidImageFile, formatFileSize } from '@/lib/utils';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export default function UploadPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { accessToken } = useAuthStore();
  
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  /**
   * Handle file drop
   */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate files
    const validFiles = acceptedFiles.filter((file) => {
      if (!isValidImageFile(file)) {
        alert(`${file.name} is not a valid image file`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large (max 50MB)`);
        return false;
      }
      return true;
    });

    // Add to files list
    const uploadFiles: UploadFile[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending',
    }));

    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  /**
   * Dropzone configuration
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple: true,
  });

  /**
   * Upload a single file
   */
  const uploadFile = async (uploadFile: UploadFile, index: number) => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('projectId', projectId);

    try {
      // Update status
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'uploading' as const } : f
        )
      );

      // Create abort controller with 10 minute timeout (uploads can be slow)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      // Update status to completed
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: 'completed' as const, progress: 100 }
            : f
        )
      );
    } catch (error: any) {
      // Update status to failed
      const errorMessage = error.name === 'AbortError'
        ? 'Upload timeout - file too large or network too slow'
        : error.message || 'Upload failed';

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'failed' as const,
                error: errorMessage,
              }
            : f
        )
      );
    }
  };

  /**
   * Upload all files
   */
  const handleUploadAll = async () => {
    setUploading(true);

    // Upload files sequentially (or in parallel with Promise.all)
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
      }
    }

    setUploading(false);
  };

  /**
   * Remove a file from the list
   */
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Navigate back to project
   */
  const handleDone = () => {
    router.push(`/project/${projectId}`);
  };

  const allCompleted = files.length > 0 && files.every((f) => f.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Upload Photos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            
            <button
              onClick={() => router.push(`/project/${projectId}`)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            border-4 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="text-6xl mb-4">📸</div>
          {isDragActive ? (
            <p className="text-xl text-blue-600 dark:text-blue-400 font-semibold">
              Drop photos here...
            </p>
          ) : (
            <>
              <p className="text-xl text-gray-900 dark:text-white font-semibold mb-2">
                Drag & drop photos here
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                or click to select files
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Supports JPEG, PNG, WebP • Max 50MB per file
              </p>
            </>
          )}
        </div>

        {/* Files list */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Files ({files.length})
              </h2>
              
              {!allCompleted && (
                <button
                  onClick={handleUploadAll}
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload All'}
                </button>
              )}
              
              {allCompleted && (
                <button
                  onClick={handleDone}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Done ✓
                </button>
              )}
            </div>

            <div className="space-y-3">
              {files.map((uploadFile, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-4"
                >
                  {/* Status icon */}
                  <div className="text-3xl">
                    {uploadFile.status === 'pending' && '⏳'}
                    {uploadFile.status === 'uploading' && (
                      <div className="spinner w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    )}
                    {uploadFile.status === 'completed' && '✅'}
                    {uploadFile.status === 'failed' && '❌'}
                  </div>

                  {/* File info */}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                    {uploadFile.error && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {uploadFile.error}
                      </p>
                    )}
                  </div>

                  {/* Progress bar */}
                  {uploadFile.status === 'uploading' && (
                    <div className="w-32">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadFile.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Remove button */}
                  {uploadFile.status === 'pending' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

