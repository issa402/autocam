/**
 * Token Refresh API Endpoint
 * 
 * POST /api/auth/refresh
 * 
 * This endpoint refreshes an expired access token using a refresh token.
 * 
 * Request body:
 * {
 *   refreshToken: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     accessToken: string,
 *     refreshToken: string (new refresh token)
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken, generateRefreshToken, getUserIdFromToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { refreshToken } = body;

    // Validate input
    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Refresh token is required',
        },
        { status: 400 }
      );
    }

    // Verify refresh token and get user ID
    const userId = getUserIdFromToken(refreshToken);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired refresh token',
        },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 401 }
      );
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return NextResponse.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

