/**
 * Utility Functions
 * 
 * This file contains helper functions used throughout the application.
 * These are pure functions that don't have side effects.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names intelligently
 * 
 * Why this function?
 * - Merges Tailwind classes without conflicts
 * - Handles conditional classes
 * - Removes duplicate classes
 * 
 * Example:
 * cn('px-2 py-1', 'px-4') => 'py-1 px-4' (px-4 overrides px-2)
 * 
 * @param inputs - Class names to combine
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats file size from bytes to human-readable format
 * 
 * Example:
 * formatFileSize(1024) => "1 KB"
 * formatFileSize(1048576) => "1 MB"
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Formats a date to relative time
 * 
 * Example:
 * formatRelativeTime(new Date(Date.now() - 60000)) => "1 minute ago"
 * formatRelativeTime(new Date(Date.now() - 3600000)) => "1 hour ago"
 * 
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

/**
 * Debounces a function call
 * 
 * Why debounce?
 * - Prevents excessive function calls (e.g., on rapid keyboard input)
 * - Improves performance
 * - Reduces API calls
 * 
 * Example:
 * const debouncedSearch = debounce((query) => searchAPI(query), 300);
 * // searchAPI will only be called 300ms after user stops typing
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttles a function call
 * 
 * Why throttle?
 * - Limits function execution rate
 * - Useful for scroll/resize handlers
 * - Ensures function runs at most once per interval
 * 
 * Example:
 * const throttledScroll = throttle(() => handleScroll(), 100);
 * // handleScroll will run at most once every 100ms
 * 
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generates a random ID
 * 
 * Why not use UUID?
 * - Lighter weight for client-side IDs
 * - Good enough for temporary IDs
 * - Server generates proper IDs (cuid)
 * 
 * @returns Random ID string
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Validates email format
 * 
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates image file type
 * 
 * @param file - File to validate
 * @returns True if valid image type
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  return validTypes.includes(file.type);
}

/**
 * Calculates quality score color
 * 
 * Returns appropriate color class based on quality score:
 * - 80-100: Green (excellent)
 * - 60-79: Yellow (good)
 * - 0-59: Red (poor)
 * 
 * @param score - Quality score (0-100)
 * @returns Tailwind color class
 */
export function getQualityColor(score: number): string {
  if (score >= 80) return 'text-green-500 bg-green-100';
  if (score >= 60) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-500 bg-red-100';
}

/**
 * Truncates text to specified length
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Safely parses JSON
 * 
 * Why this function?
 * - Prevents JSON.parse errors from crashing the app
 * - Returns fallback value on error
 * 
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Copies text to clipboard
 * 
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

/**
 * Downloads a file from URL
 * 
 * @param url - File URL
 * @param filename - Desired filename
 */
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

