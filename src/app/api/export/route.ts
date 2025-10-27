/**
 * Export API Endpoint
 *
 * POST /api/export - Create export job
 * GET /api/export/:id - Get export job status
 *
 * CRITICAL: Only exports photos from FINAL set!
 * This is the final step of the 3-set workflow.
 *
 * This endpoint handles exporting selected photos to:
 * - Google Drive
 * - Facebook
 * - Dropbox
 * - Direct download (ZIP)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';
import { queueExport } from '@/lib/queue';

/**
 * POST /api/export
 * 
 * Creates a new export job
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Request body:
 * {
 *   projectId: string,
 *   destination: 'google_drive' | 'facebook' | 'dropbox' | 'download',
 *   photoIds: string[], // Array of photo IDs to export
 *   config: {
 *     // Destination-specific config
 *     // For Google Drive: { folderId: string }
 *     // For Facebook: { albumId: string }
 *     // For Dropbox: { path: string }
 *     // For download: { format: 'zip' | 'individual' }
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     exportJobId: string,
 *     status: 'pending'
 *   }
 * }
 */
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

    // Parse request body
    const body = await request.json();
    const { projectId, destination, photoIds, config } = body;

    // Validate inputs
    if (!projectId || !destination || !photoIds || !Array.isArray(photoIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    // Validate destination
    const validDestinations = ['google_drive', 'facebook', 'dropbox', 'download'];
    if (!validDestinations.includes(destination)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid destination',
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

    // CRITICAL: Only export photos from FINAL set!
    // This ensures we only export photos user has selected
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        projectId,
        photoSet: 'FINAL', // CRITICAL: Only FINAL set photos
      },
    });

    if (photos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No photos in FINAL set to export. Please select photos first.',
        },
        { status: 400 }
      );
    }

    if (photos.length !== photoIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Only ${photos.length} of ${photoIds.length} photos are in FINAL set`,
        },
        { status: 400 }
      );
    }

    // Create export job in database
    const exportJob = await prisma.exportJob.create({
      data: {
        userId,
        projectId,
        destination,
        photoIds,
        config: config || {},
        status: 'pending',
        progress: 0,
      },
    });

    // Queue export job for processing
    await queueExport(
      exportJob.id,
      userId,
      projectId,
      destination,
      photoIds,
      config || {}
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          exportJobId: exportJob.id,
          status: exportJob.status,
        },
        message: 'Export job created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating export job:', error);
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
 * GET /api/export?id=xxx
 * 
 * Gets export job status
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Query parameters:
 * - id: Export job ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     status: 'pending' | 'processing' | 'completed' | 'failed',
 *     progress: number, // 0-100
 *     errorMessage?: string
 *   }
 * }
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const exportJobId = searchParams.get('id');

    if (!exportJobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Export job ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch export job
    const exportJob = await prisma.exportJob.findFirst({
      where: {
        id: exportJobId,
        userId, // Ensure user owns this job
      },
    });

    if (!exportJob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Export job not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: exportJob.id,
        status: exportJob.status,
        progress: exportJob.progress,
        errorMessage: exportJob.errorMessage,
        createdAt: exportJob.createdAt,
        completedAt: exportJob.completedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching export job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

