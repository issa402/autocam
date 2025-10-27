/**
 * Image Processing Service
 * 
 * This service handles image manipulation tasks:
 * - Generating thumbnails
 * - Extracting EXIF metadata
 * - Image optimization
 * 
 * We use Sharp library because:
 * - Fast (uses libvips, written in C)
 * - Memory efficient
 * - Supports all major formats
 * - Can extract EXIF data
 */

import sharp from 'sharp';

/**
 * Thumbnail sizes
 * Small: For grid view (400px wide)
 * Medium: For lightbox preview (1200px wide)
 * Large: For full-screen view (2400px wide)
 */
export const THUMBNAIL_SIZES = {
  small: 400,
  medium: 1200,
  large: 2400,
} as const;

/**
 * Generates a thumbnail from an image buffer
 * 
 * Process:
 * 1. Resize image to specified width (maintains aspect ratio)
 * 2. Convert to WebP format (smaller file size, good quality)
 * 3. Apply quality compression
 * 
 * Why WebP?
 * - 25-35% smaller than JPEG at same quality
 * - Supports transparency
 * - Widely supported by browsers
 * 
 * @param imageBuffer - Original image buffer
 * @param size - Target width in pixels
 * @returns Thumbnail buffer in WebP format
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  size: number
): Promise<Buffer> {
  try {
    const thumbnail = await sharp(imageBuffer)
      // Resize to target width, maintain aspect ratio
      .resize(size, null, {
        fit: 'inside', // Fit within dimensions
        withoutEnlargement: true, // Don't upscale small images
      })
      // Convert to WebP with quality 85 (good balance of size/quality)
      .webp({ quality: 85 })
      // Return as buffer
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw new Error('Failed to generate thumbnail');
  }
}

/**
 * Generates all thumbnail sizes for an image
 * 
 * @param imageBuffer - Original image buffer
 * @returns Object with small, medium, and large thumbnail buffers
 */
export async function generateAllThumbnails(imageBuffer: Buffer): Promise<{
  small: Buffer;
  medium: Buffer;
  large: Buffer;
}> {
  try {
    // Generate all thumbnails in parallel for speed
    const [small, medium, large] = await Promise.all([
      generateThumbnail(imageBuffer, THUMBNAIL_SIZES.small),
      generateThumbnail(imageBuffer, THUMBNAIL_SIZES.medium),
      generateThumbnail(imageBuffer, THUMBNAIL_SIZES.large),
    ]);

    return { small, medium, large };
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    throw new Error('Failed to generate thumbnails');
  }
}

/**
 * Extracts EXIF metadata from an image
 * 
 * EXIF data includes:
 * - Camera model
 * - Lens information
 * - ISO, shutter speed, aperture
 * - Date taken
 * - GPS coordinates (if available)
 * 
 * @param imageBuffer - Image buffer
 * @returns EXIF metadata object
 */
export async function extractMetadata(imageBuffer: Buffer): Promise<any> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Extract relevant EXIF data
    const exif = metadata.exif ? parseExif(metadata.exif) : {};

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      ...exif,
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return {};
  }
}

/**
 * Parses EXIF buffer into readable object
 * 
 * EXIF data is stored in binary format, this converts it to JSON
 * 
 * @param exifBuffer - EXIF data buffer
 * @returns Parsed EXIF object
 */
function parseExif(exifBuffer: Buffer): any {
  try {
    // This is a simplified parser
    // In production, you might want to use a library like 'exif-parser'
    // For now, we'll return basic info
    return {
      // Add EXIF parsing logic here
      // Example fields:
      // camera: 'Canon EOS R5',
      // lens: 'RF 70-200mm f/2.8',
      // iso: 3200,
      // shutterSpeed: '1/1000',
      // aperture: 'f/2.8',
      // focalLength: '200mm',
    };
  } catch (error) {
    console.error('Error parsing EXIF:', error);
    return {};
  }
}

/**
 * Gets image dimensions without loading full image
 * 
 * Why this is useful:
 * - Fast (only reads image header)
 * - Memory efficient (doesn't load full image)
 * 
 * @param imageBuffer - Image buffer
 * @returns Width and height
 */
export async function getImageDimensions(imageBuffer: Buffer): Promise<{
  width: number;
  height: number;
}> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    throw new Error('Failed to get image dimensions');
  }
}

/**
 * Optimizes an image for web
 * 
 * Process:
 * - Strips metadata (reduces file size)
 * - Applies compression
 * - Converts to efficient format
 * 
 * @param imageBuffer - Original image buffer
 * @param quality - Quality (1-100)
 * @returns Optimized image buffer
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  quality: number = 85
): Promise<Buffer> {
  try {
    const optimized = await sharp(imageBuffer)
      // Default behavior strips all metadata (EXIF, ICC profile, etc.)
      // Convert to JPEG with specified quality
      .jpeg({ quality, progressive: true })
      .toBuffer();

    return optimized;
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw new Error('Failed to optimize image');
  }
}

/**
 * Validates that buffer is a valid image
 * 
 * @param buffer - Buffer to validate
 * @returns True if valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    await sharp(buffer).metadata();
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts image to specific format
 * 
 * @param imageBuffer - Original image buffer
 * @param format - Target format (jpeg, png, webp)
 * @returns Converted image buffer
 */
export async function convertFormat(
  imageBuffer: Buffer,
  format: 'jpeg' | 'png' | 'webp'
): Promise<Buffer> {
  try {
    let converter = sharp(imageBuffer);

    switch (format) {
      case 'jpeg':
        converter = converter.jpeg({ quality: 90 });
        break;
      case 'png':
        converter = converter.png({ compressionLevel: 9 });
        break;
      case 'webp':
        converter = converter.webp({ quality: 90 });
        break;
    }

    return await converter.toBuffer();
  } catch (error) {
    console.error('Error converting format:', error);
    throw new Error('Failed to convert image format');
  }
}

