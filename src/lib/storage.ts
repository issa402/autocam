/**
 * Object Storage Service (Supabase Storage)
 *
 * This service handles all interactions with Supabase Storage.
 *
 * What it does:
 * - Uploads photos to Supabase Storage
 * - Generates signed URLs for secure access
 * - Deletes photos
 * - Manages thumbnails
 *
 * Why Supabase Storage?
 * - Integrated with our database
 * - Built on S3 under the hood
 * - Simple API
 * - Row-level security support
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Initialize Supabase Client
 */
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Bucket name from environment
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'photos';

/**
 * Uploads a file to object storage
 *
 * @param file - File buffer to upload
 * @param key - Storage key (path) for the file
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(key, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Return public URL
    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(key);

    return publicData.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file to storage');
  }
}

/**
 * Generates a signed URL for secure file access
 *
 * Why signed URLs?
 * - Temporary access (expires after set time)
 * - Secure (can't be guessed)
 * - No need to make files public
 *
 * @param key - Storage key of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(key, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Deletes a file from storage
 *
 * @param key - Storage key of the file to delete
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([key]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file from storage');
  }
}

/**
 * Checks if a file exists in storage
 *
 * @param key - Storage key to check
 * @returns True if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1, search: key });

    if (error) {
      return false;
    }

    return data.some(file => file.name === key);
  } catch (error) {
    return false;
  }
}

/**
 * Generates storage key for a photo
 * 
 * Storage structure:
 * originals/{userId}/{projectId}/{photoId}.{ext}
 * thumbnails/small/{userId}/{projectId}/{photoId}.webp
 * thumbnails/medium/{userId}/{projectId}/{photoId}.webp
 * thumbnails/large/{userId}/{projectId}/{photoId}.webp
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param photoId - Photo ID
 * @param type - File type (original, thumbnail-small, etc.)
 * @param extension - File extension
 * @returns Storage key
 */
export function generateStorageKey(
  userId: string,
  projectId: string,
  photoId: string,
  type: 'original' | 'thumbnail-small' | 'thumbnail-medium' | 'thumbnail-large',
  extension: string
): string {
  switch (type) {
    case 'original':
      return `originals/${userId}/${projectId}/${photoId}.${extension}`;
    case 'thumbnail-small':
      return `thumbnails/small/${userId}/${projectId}/${photoId}.webp`;
    case 'thumbnail-medium':
      return `thumbnails/medium/${userId}/${projectId}/${photoId}.webp`;
    case 'thumbnail-large':
      return `thumbnails/large/${userId}/${projectId}/${photoId}.webp`;
    default:
      throw new Error(`Invalid storage type: ${type}`);
  }
}

/**
 * Extracts file extension from filename
 * 
 * @param filename - Original filename
 * @returns File extension (without dot)
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
}

/**
 * Validates file size
 * 
 * @param fileSize - File size in bytes
 * @param maxSize - Maximum allowed size in bytes (default: 50MB)
 * @returns True if valid
 */
export function isValidFileSize(fileSize: number, maxSize: number = 50 * 1024 * 1024): boolean {
  return fileSize > 0 && fileSize <= maxSize;
}

/**
 * Gets public URL for a storage key
 *
 * @param key - Storage key
 * @returns Public URL
 */
export function getPublicUrl(key: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(key);

  return data.publicUrl;
}

