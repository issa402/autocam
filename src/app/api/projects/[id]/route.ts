/**
 * Project Detail API Endpoint
 * 
 * DELETE /api/projects/[id] - Delete a project and all associated photos
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';
import { deleteFile } from '@/lib/storage';

/**
 * DELETE /api/projects/[id]
 * 
 * Deletes a project and all associated photos from database and storage
 * 
 * Headers:
 * Authorization: Bearer <token>
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const projectId = params.id;

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
      include: {
        photos: true,
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

    // Delete all photos from storage
    for (const photo of project.photos) {
      try {
        if (photo.originalUrl) {
          // Extract the path from the URL
          const urlParts = photo.originalUrl.split('/storage/v1/object/public/photos/');
          if (urlParts.length > 1) {
            await deleteFile(urlParts[1]);
          }
        }
      } catch (error) {
        console.warn(`Failed to delete photo file ${photo.id}:`, error);
        // Continue deleting other photos even if one fails
      }
    }

    // Delete project and all associated photos (cascade delete)
    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

