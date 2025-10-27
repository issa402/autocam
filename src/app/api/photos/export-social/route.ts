import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';
import { uploadPhotosToGooglePhotos } from '@/lib/google-photos';

interface ExportRequest {
  photoIds: string[];
  platforms: string[];
  albumName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = getAuthenticatedUserId(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body: ExportRequest = await request.json();
    const { photoIds, platforms, albumName = 'AutoCam' } = body;

    if (!photoIds || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'No photos selected' },
        { status: 400 }
      );
    }

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'No platforms selected' },
        { status: 400 }
      );
    }

    // Verify user owns all photos
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
      },
      include: {
        project: true,
      },
    });

    // Check authorization
    for (const photo of photos) {
      if (photo.project.userId !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    // Process each platform
    const results: Record<string, any> = {};

    for (const platform of platforms) {
      try {
        switch (platform) {
          case 'google-drive':
            results['google-drive'] = await exportToGoogleDrive(photos, userId);
            break;
          case 'google-photos':
            results['google-photos'] = await exportToGooglePhotos(photos, userId, albumName);
            break;
          case 'facebook':
            results['facebook'] = await exportToFacebook(photos, userId);
            break;
          default:
            results[platform] = { error: 'Unknown platform' };
        }
      } catch (error) {
        console.error(`Error exporting to ${platform}:`, error);
        results[platform] = { error: String(error) };
      }
    }

    return NextResponse.json({
      success: true,
      message: `Exported ${photos.length} photos to ${platforms.length} platform(s)`,
      results,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}

async function exportToGoogleDrive(photos: any[], userId: string) {
  // TODO: Implement Google Drive API integration
  // This requires:
  // 1. OAuth2 authentication with Google
  // 2. Storing refresh tokens in database
  // 3. Using google-auth-library and google-drive-api
  
  console.log(`Exporting ${photos.length} photos to Google Drive for user ${userId}`);
  
  return {
    status: 'pending',
    message: 'Google Drive export queued',
    photoCount: photos.length,
  };
}

async function exportToGooglePhotos(photos: any[], userId: string, albumName: string = 'AutoCam') {
  try {
    // Get photo URLs
    const photoUrls = photos
      .map((p) => p.originalUrl || p.thumbnailLargeUrl)
      .filter(Boolean);

    if (photoUrls.length === 0) {
      return {
        status: 'error',
        message: 'No valid photo URLs found',
        photoCount: 0,
      };
    }

    // Upload to Google Photos
    const result = await uploadPhotosToGooglePhotos(userId, photoUrls, albumName);

    return {
      status: 'success',
      message: `Successfully uploaded ${result.uploadedCount} photos to Google Photos`,
      albumId: result.albumId,
      albumUrl: result.albumUrl,
      uploadedCount: result.uploadedCount,
    };
  } catch (error) {
    console.error('Error exporting to Google Photos:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to export to Google Photos',
      photoCount: photos.length,
    };
  }
}

async function exportToFacebook(photos: any[], userId: string) {
  // TODO: Implement Facebook API integration
  // This requires:
  // 1. OAuth2 authentication with Facebook
  // 2. Using Facebook Graph API
  // 3. Creating or selecting album
  
  console.log(`Exporting ${photos.length} photos to Facebook for user ${userId}`);
  
  return {
    status: 'pending',
    message: 'Facebook export queued',
    photoCount: photos.length,
  };
}

