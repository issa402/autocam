/**
 * Photos API Endpoint
 * 
 * GET /api/photos?projectId=xxx - List photos in a project
 * PATCH /api/photos - Batch update photos (selection, rating)
 * 
 * This endpoint handles:
 * - Fetching photos with filters
 * - Batch updating photo selection state
 * - Sorting and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';

/**
 * GET /api/photos
 * 
 * Fetches photos for a project with optional filters
 * 
 * Query parameters:
 * - projectId: string (required)
 * - showBlurry: boolean (default: true)
 * - showSelected: boolean (default: true)
 * - minQuality: number (0-100)
 * - sortBy: 'quality' | 'time' | 'name' (default: 'time')
 * - order: 'asc' | 'desc' (default: 'desc')
 * 
 * Headers:
 * Authorization: Bearer <token>
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
    const projectId = searchParams.get('projectId');
    const showBlurry = searchParams.get('showBlurry') !== 'false'; // Default true
    const showSelected = searchParams.get('showSelected') !== 'false'; // Default true
    const minQuality = searchParams.get('minQuality');
    const sortBy = searchParams.get('sortBy') || 'time';
    const order = searchParams.get('order') || 'desc';

    // Validate project ID
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

    // Build where clause for filters
    const where: any = {
      projectId,
    };

    // Filter by blur status
    if (!showBlurry) {
      where.isBlurry = false;
    }

    // Filter by quality score
    if (minQuality) {
      where.qualityScore = {
        gte: parseFloat(minQuality),
      };
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'quality':
        orderBy = { qualityScore: order };
        break;
      case 'name':
        orderBy = { filename: order };
        break;
      case 'time':
      default:
        orderBy = { createdAt: order };
        break;
    }

    // Fetch photos
    const photos = await prisma.photo.findMany({
      where,
      orderBy,
      // Convert BigInt to string for JSON serialization
      select: {
        id: true,
        projectId: true,
        filename: true,
        originalUrl: true,
        thumbnailSmallUrl: true,
        thumbnailMediumUrl: true,
        thumbnailLargeUrl: true,
        fileSize: true,
        mimeType: true,
        width: true,
        height: true,
        blurScore: true,
        isBlurry: true,
        qualityScore: true,
        hasFaces: true,
        faceCount: true,
        exposureScore: true,
        photoSet: true,
        isSelected: true,
        starRating: true,
        metadata: true,
        createdAt: true,
        analyzedAt: true,
      },
    });

    // Convert BigInt to string for JSON
    const photosWithStringFileSize = photos.map((photo) => ({
      ...photo,
      fileSize: photo.fileSize.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: photosWithStringFileSize,
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
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
 * PATCH /api/photos
 * 
 * Batch update photos (selection state, ratings)
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Request body:
 * {
 *   updates: [
 *     {
 *       id: string,
 *       isSelected?: boolean,
 *       starRating?: number
 *     }
 *   ]
 * }
 */
export async function PATCH(request: NextRequest) {
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
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Updates array is required',
        },
        { status: 400 }
      );
    }

    // Batch update photos
    // Use transaction for atomicity
    const results = await prisma.$transaction(
      updates.map((update: any) => {
        const { id, isSelected, starRating } = update;
        
        // Build update data
        const data: any = {};
        if (isSelected !== undefined) data.isSelected = isSelected;
        if (starRating !== undefined) data.starRating = starRating;

        return prisma.photo.update({
          where: { id },
          data,
        });
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        updated: results.length,
      },
      message: 'Photos updated successfully',
    });
  } catch (error) {
    console.error('Error updating photos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

