/**
 * Projects API Endpoint
 * 
 * GET /api/projects - List all projects for authenticated user
 * POST /api/projects - Create a new project
 * 
 * A project represents a photo session (e.g., "Basketball Game 2024")
 * Projects group photos together for organization
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';

/**
 * GET /api/projects
 * 
 * Returns all projects for the authenticated user
 * Includes photo count and selected photo count
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: string,
 *       name: string,
 *       description: string,
 *       status: string,
 *       photoCount: number,
 *       selectedCount: number,
 *       createdAt: Date,
 *       updatedAt: Date
 *     }
 *   ]
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

    // Fetch projects with photo counts
    const projects = await prisma.project.findMany({
      where: {
        userId,
      },
      include: {
        // Include photo counts
        _count: {
          select: {
            photos: true,
          },
        },
        photos: {
          where: {
            isSelected: true,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Newest first
      },
    });

    // Transform data to include counts
    const projectsWithCounts = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      photoCount: project._count.photos,
      selectedCount: project.photos.length,
    }));

    return NextResponse.json({
      success: true,
      data: projectsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
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
 * POST /api/projects
 * 
 * Creates a new project
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Request body:
 * {
 *   name: string,
 *   description?: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     name: string,
 *     description: string,
 *     status: string,
 *     createdAt: Date,
 *     updatedAt: Date
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
    const { name, description } = body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project name is required',
        },
        { status: 400 }
      );
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId,
        status: 'active',
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: project,
        message: 'Project created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

