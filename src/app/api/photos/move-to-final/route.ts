/**
 * Move Photos to FINAL Set API Route
 * 
 * CRITICAL: This is the core of the 3-set workflow!
 * 
 * When user selects photos from BLURRY or CLEAN set:
 * 1. Frontend calls this endpoint with photo IDs
 * 2. Backend updates photoSet to 'FINAL' for those photos
 * 3. Photos are now in FINAL set ready for upload
 * 
 * This is NOT deletion - photos stay in database, just change set.
 * 
 * Endpoint: POST /api/photos/move-to-final
 * Body: { photoIds: string[] }
 * Response: { success: true, movedCount: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/photos/move-to-final
 * Moves photos from BLURRY or CLEAN set to FINAL set
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { photoIds } = body;
    
    // Validate input
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'photoIds array is required' },
        { status: 400 }
      );
    }
    
    // TODO: Add authentication check
    // const userId = await getUserIdFromToken(request);
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    // CRITICAL: Update photoSet to FINAL for selected photos
    // This moves photos from BLURRY or CLEAN set to FINAL set
    // Photos are NOT deleted, just reassigned to FINAL set
    const result = await prisma.photo.updateMany({
      where: {
        id: {
          in: photoIds, // Update all photos with IDs in the array
        },
        // Only move photos from BLURRY or CLEAN sets
        // (PENDING photos should wait for AI analysis)
        // (FINAL photos are already in FINAL set)
        photoSet: {
          in: ['BLURRY', 'CLEAN'],
        },
      },
      data: {
        photoSet: 'FINAL', // Move to FINAL set
        isSelected: true, // Mark as selected
      },
    });
    
    console.log(`Moved ${result.count} photos to FINAL set`);
    
    // Return success response
    return NextResponse.json({
      success: true,
      movedCount: result.count,
      message: `${result.count} photo${result.count !== 1 ? 's' : ''} moved to Final Set`,
    });
    
  } catch (error) {
    console.error('Error moving photos to FINAL set:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to move photos to FINAL set',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/photos/move-to-final
 * Removes photos from FINAL set (moves back to original set)
 * 
 * This allows users to "unselect" photos from FINAL set
 */
export async function DELETE(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { photoIds } = body;
    
    // Validate input
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'photoIds array is required' },
        { status: 400 }
      );
    }
    
    // TODO: Add authentication check
    
    // Get photos to determine their original set (BLURRY or CLEAN)
    const photos = await prisma.photo.findMany({
      where: {
        id: {
          in: photoIds,
        },
        photoSet: 'FINAL', // Only remove from FINAL set
      },
      select: {
        id: true,
        isBlurry: true, // Use this to determine original set
      },
    });
    
    // Move photos back to original set based on isBlurry flag
    const updatePromises = photos.map((photo) => {
      const originalSet = photo.isBlurry ? 'BLURRY' : 'CLEAN';
      
      return prisma.photo.update({
        where: { id: photo.id },
        data: {
          photoSet: originalSet, // Move back to original set
          isSelected: false, // Unmark as selected
        },
      });
    });
    
    await Promise.all(updatePromises);
    
    console.log(`Removed ${photos.length} photos from FINAL set`);
    
    // Return success response
    return NextResponse.json({
      success: true,
      removedCount: photos.length,
      message: `${photos.length} photo${photos.length !== 1 ? 's' : ''} removed from Final Set`,
    });
    
  } catch (error) {
    console.error('Error removing photos from FINAL set:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove photos from FINAL set',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

