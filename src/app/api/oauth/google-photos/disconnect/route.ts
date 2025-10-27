import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extractBearerToken, getUserIdFromToken } from '@/lib/auth';

/**
 * Disconnect Google Photos OAuth
 * Deletes the stored token to force re-authorization
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);
    const userId = token ? getUserIdFromToken(token) : null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the Google Photos token
    await prisma.oAuthToken.deleteMany({
      where: {
        userId,
        provider: 'google-photos',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Photos disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Google Photos:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Photos' },
      { status: 500 }
    );
  }
}

