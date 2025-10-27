/**
 * Photo Upload API Endpoint
 * 
 * POST /api/photos/upload
 * 
 * This endpoint handles photo uploads:
 * 1. Receives photo file from client
 * 2. Validates file (type, size)
 * 3. Uploads to S3/R2 storage
 * 4. Generates thumbnails
 * 5. Extracts metadata
 * 6. Creates database record
 * 7. Queues AI analysis job
 * 
 * This is a multipart/form-data endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';
import { uploadFile, generateStorageKey, getFileExtension, isValidFileSize } from '@/lib/storage';
import { generateAllThumbnails, extractMetadata, getImageDimensions } from '@/lib/image-processor';
import { queueAIAnalysis, queueThumbnailGeneration } from '@/lib/queue';
import { isValidImageFile } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const userId = getAuthenticatedUserId(authHeader);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      );
    }

    // Validate file type
    if (!isValidImageFile(file)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are supported',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    if (!isValidFileSize(file.size)) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large. Maximum size is 50MB',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract image dimensions
    const dimensions = await getImageDimensions(buffer);

    // Extract metadata (EXIF)
    const metadata = await extractMetadata(buffer);

    // Create photo record in database (before upload for ID)
    const now = new Date();
    const photo = await prisma.photo.create({
      data: {
        projectId,
        filename: file.name,
        originalUrl: '', // Will update after upload
        fileSize: BigInt(file.size),
        mimeType: file.type,
        width: dimensions.width,
        height: dimensions.height,
        metadata: metadata as any,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Generate storage key
    const extension = getFileExtension(file.name);
    const storageKey = generateStorageKey(userId, projectId, photo.id, 'original', extension);

    // Upload original photo to S3/R2
    const originalUrl = await uploadFile(buffer, storageKey, file.type);

    // Update photo record with URL
    await prisma.photo.update({
      where: { id: photo.id },
      data: { originalUrl },
    });

    // Queue thumbnail generation (fire-and-forget, don't await)
    queueThumbnailGeneration(photo.id, originalUrl).catch((queueError) => {
      console.warn('Warning: Failed to queue thumbnail generation:', queueError);
      // Don't fail the upload if queue fails
    });

    // CRITICAL: Call AI worker directly (don't use Redis queue)
    // This ensures photos are analyzed immediately without depending on Redis
    const aiWorkerUrl = process.env.AI_WORKER_URL || 'http://localhost:8001';
    console.log(`🚀 Calling AI worker at ${aiWorkerUrl}/analyze for photo ${photo.id}`);

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    fetch(`${aiWorkerUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo_id: photo.id,
        image_url: originalUrl,
        project_id: projectId,
      }),
      signal: controller.signal,
    }).then((res) => {
      clearTimeout(timeoutId);
      console.log(`✅ AI analysis response status: ${res.status} for photo ${photo.id}`);
      return res.json();
    }).then((data) => {
      console.log('✅ AI analysis succeeded for photo:', photo.id, data);
    }).catch((error) => {
      clearTimeout(timeoutId);
      console.error(`❌ AI analysis call failed for photo ${photo.id}:`, error.message);
      // Still don't fail the upload - user can manually trigger analysis later
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: photo.id,
          filename: photo.filename,
          originalUrl: photo.originalUrl,
          status: 'processing', // AI analysis in progress
        },
        message: 'Photo uploaded successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Configure Next.js to handle large file uploads
 */
export const maxDuration = 300; // 5 minutes for large uploads

