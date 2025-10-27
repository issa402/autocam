import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/auth';

/**
 * Google Photos OAuth Login
 * Redirects user to Google for authorization
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Build Google OAuth URL
    // IMPORTANT: Using 'consent' to force Google to show consent screen with NEW scope
    // CRITICAL: As of March 31, 2025, Google deprecated the old 'photoslibrary' scope
    // Need BOTH NEW scopes:
    // 1. photoslibrary.appendonly - to upload photos and create albums
    // 2. photoslibrary.readonly.appcreateddata - to read albums you created
    const scopes = [
      'https://www.googleapis.com/auth/photoslibrary.appendonly',
      'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google-photos/callback`,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',  // CRITICAL: Forces Google to show consent screen with NEW scope
      state: token, // Pass token as state for verification
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({
      authUrl: googleAuthUrl,
    });
  } catch (error) {
    console.error('OAuth login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}

