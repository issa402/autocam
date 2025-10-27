/**
 * Photo Cropping API Endpoint
 * 
 * POST /api/photos/crop
 * 
 * Handles uploading cropped photos to Supabase Storage
 * and updating the photo record with the cropped URL
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';
import { uploadFile, generateStorageKey, getFileExtension } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const userId = getAuthenticatedUserId(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const photoId = formData.get('photoId') as string;

    if (!file || !photoId) {
      return NextResponse.json(
        { error: 'File and photoId are required' },
        { status: 400 }
      );
    }

    // Get photo to verify ownership
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { project: true },
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Verify user owns the project
    if (photo.project.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate storage key for cropped image
    // Use 'original' type with a modified photoId to distinguish cropped versions
    const extension = 'jpg';
    const croppedPhotoId = `${photoId}_cropped`;
    const storageKey = generateStorageKey(
      userId,
      photo.projectId,
      croppedPhotoId,
      'original',
      extension
    );

    // Upload cropped image to Supabase Storage
    const croppedUrl = await uploadFile(buffer, storageKey, 'image/jpeg');

    // Update photo record with cropped URL
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        originalUrl: croppedUrl, // Replace original with cropped version
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      croppedUrl,
      message: 'Photo cropped and saved successfully',
    });

  } catch (error) {
    console.error('Error cropping photo:', error);

    return NextResponse.json(
      {
        error: 'Failed to crop photo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

