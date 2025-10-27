/**
 * Manual Photo Analysis Endpoint
 * 
 * POST /api/photos/analyze-pending
 * 
 * This endpoint manually triggers AI analysis for photos stuck in PENDING state.
 * Useful for debugging and recovery when the automatic analysis fails.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';

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

    // Get request body
    const body = await request.json();
    const { projectId, photoIds } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
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
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get photos to analyze
    let photos;
    if (photoIds && photoIds.length > 0) {
      // Analyze specific photos
      photos = await prisma.photo.findMany({
        where: {
          id: { in: photoIds },
          projectId,
        },
      });
    } else {
      // Analyze all PENDING photos in project
      photos = await prisma.photo.findMany({
        where: {
          projectId,
          photoSet: 'PENDING',
        },
      });
    }

    if (photos.length === 0) {
      return NextResponse.json(
        { message: 'No photos to analyze' },
        { status: 200 }
      );
    }

    console.log(`🚀 Manually triggering AI analysis for ${photos.length} photos`);

    // Trigger AI analysis for each photo
    const aiWorkerUrl = process.env['AI_WORKER_URL'] || 'http://localhost:8001';
    const results = [];

    for (const photo of photos) {
      try {
        console.log(`📸 Analyzing photo ${photo.id}: ${photo.filename}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

        const response = await fetch(`${aiWorkerUrl}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo_id: photo.id,
            image_url: photo.originalUrl,
            project_id: projectId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Analysis succeeded for photo ${photo.id}:`, data);
          results.push({
            photoId: photo.id,
            filename: photo.filename,
            success: true,
            data,
          });
        } else {
          const error = await response.text();
          console.error(`❌ Analysis failed for photo ${photo.id}:`, error);
          results.push({
            photoId: photo.id,
            filename: photo.filename,
            success: false,
            error: `HTTP ${response.status}`,
          });
        }
      } catch (error) {
        console.error(`❌ Error analyzing photo ${photo.id}:`, error);
        results.push({
          photoId: photo.id,
          filename: photo.filename,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json(
      {
        message: `Analysis complete: ${successful} succeeded, ${failed} failed`,
        total: photos.length,
        successful,
        failed,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in analyze-pending endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

