/**
 * TypeScript Type Definitions
 *
 * This file contains all custom types used throughout the application.
 *
 * Why TypeScript?
 * - Catch errors at compile time
 * - Better IDE autocomplete
 * - Self-documenting code
 * - Easier refactoring
 */

/**
 * PhotoSet Enum
 * Defines which set a photo belongs to in the 3-set workflow
 *
 * CRITICAL: 3-Set Workflow
 * - PENDING: Just uploaded, waiting for AI analysis
 * - BLURRY: AI detected as blurry (user can review and rescue)
 * - CLEAN: AI detected as clean/sharp (user selects keepers)
 * - FINAL: User selected from BLURRY or CLEAN (ready for upload)
 */
export type PhotoSet = 'PENDING' | 'BLURRY' | 'CLEAN' | 'FINAL';

/**
 * Photo type
 * Represents a photo with all its metadata and AI analysis results
 */
export interface Photo {
  id: string;
  projectId: string;
  filename: string;
  originalUrl: string;
  thumbnailSmallUrl: string | null;
  thumbnailMediumUrl: string | null;
  thumbnailLargeUrl: string | null;
  fileSize: bigint;
  mimeType: string;
  width: number | null;
  height: number | null;

  // AI Analysis
  blurScore: number | null;
  isBlurry: boolean;
  qualityScore: number | null;
  hasFaces: boolean;
  faceCount: number;
  exposureScore: number | null;

  // CRITICAL: Photo Set (PENDING, BLURRY, CLEAN, or FINAL)
  photoSet: PhotoSet;

  // Selection
  isSelected: boolean;
  starRating: number | null;

  // Metadata
  metadata: PhotoMetadata | null;

  // Timestamps
  createdAt: Date;
  analyzedAt: Date | null;
}

/**
 * Photo metadata (EXIF data from camera)
 */
export interface PhotoMetadata {
  camera?: string; // e.g., "Canon EOS R5"
  lens?: string; // e.g., "RF 70-200mm f/2.8"
  iso?: number; // e.g., 3200
  shutterSpeed?: string; // e.g., "1/1000"
  aperture?: string; // e.g., "f/2.8"
  focalLength?: string; // e.g., "200mm"
  dateTaken?: string; // ISO date string
  [key: string]: any; // Allow additional metadata
}

/**
 * Project type
 * Represents a photo session
 */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  
  // Computed fields (not in database)
  photoCount?: number;
  selectedCount?: number;
}

/**
 * User type
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Export job type
 * Represents an export operation
 */
export interface ExportJob {
  id: string;
  userId: string;
  projectId: string;
  destination: ExportDestination;
  config: ExportConfig;
  photoIds: string[];
  status: ExportStatus;
  progress: number; // 0-100
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Export destination options
 */
export type ExportDestination = 'google_drive' | 'facebook' | 'dropbox' | 'download';

/**
 * Export status options
 */
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Export configuration (destination-specific)
 */
export type ExportConfig = 
  | GoogleDriveConfig
  | FacebookConfig
  | DropboxConfig
  | DownloadConfig;

export interface GoogleDriveConfig {
  folderId: string; // Google Drive folder ID
  folderName?: string; // Folder name for display
}

export interface FacebookConfig {
  albumId: string; // Facebook album ID
  albumName?: string; // Album name for display
  published?: boolean; // Whether to publish immediately
}

export interface DropboxConfig {
  path: string; // Dropbox path (e.g., "/Photos/Event")
}

export interface DownloadConfig {
  format?: 'zip' | 'individual'; // Download as ZIP or individual files
}

/**
 * OAuth token type
 */
export interface OAuthToken {
  id: string;
  userId: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OAuth provider options
 */
export type OAuthProvider = 'google' | 'facebook' | 'dropbox';

/**
 * AI analysis result
 * Returned by the AI worker
 */
export interface AIAnalysisResult {
  isBlurry: boolean;
  blurScore: number;
  qualityScore: number;
  confidence: 'high' | 'medium' | 'low';
  method: 'laplacian_variance' | 'cnn_mobilenetv3';
  hasFaces?: boolean;
  faceCount?: number;
  exposureScore?: number;
}

/**
 * Upload progress event
 */
export interface UploadProgress {
  photoId: string;
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

/**
 * WebSocket message types
 */
export type WebSocketMessage =
  | AnalysisProgressMessage
  | ExportProgressMessage
  | ErrorMessage;

export interface AnalysisProgressMessage {
  type: 'analysis_progress';
  projectId: string;
  photoId: string;
  progress: number;
  result?: AIAnalysisResult;
}

export interface ExportProgressMessage {
  type: 'export_progress';
  exportJobId: string;
  progress: number;
  status: ExportStatus;
  error?: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

/**
 * API response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Filter and sort options for photos
 */
export interface PhotoFilters {
  showBlurry: boolean;
  showSelected: boolean;
  minQualityScore?: number;
  hasFaces?: boolean;
}

export type PhotoSortBy = 'quality' | 'time' | 'name' | 'size';
export type SortOrder = 'asc' | 'desc';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
}

/**
 * Toast notification type
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // milliseconds
}

