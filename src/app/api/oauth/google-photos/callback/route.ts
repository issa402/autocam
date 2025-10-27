import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { storeGooglePhotosToken } from '@/lib/google-photos';
import { getUserIdFromToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Google Photos OAuth Callback
 * Handles the redirect from Google after user authorizes
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('=== OAUTH CALLBACK START ===');
    console.log('Code:', code ? 'YES' : 'NO');
    console.log('State:', state ? 'YES' : 'NO');
    console.log('Error:', error);

    // Check for errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard?error=Google Photos auth failed: ${error}`, request.url)
      );
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(
        new URL('/dashboard?error=No authorization code received', request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google-photos/callback`,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    console.log('=== TOKEN RESPONSE ===');
    console.log('Access token:', access_token ? `${access_token.substring(0, 20)}...` : 'MISSING');
    console.log('Refresh token:', refresh_token ? `${refresh_token.substring(0, 20)}...` : 'MISSING');
    console.log('Expires in:', expires_in);

    // Get user ID from state (should be JWT token)
    const userId = getUserIdFromToken(state || '');

    console.log('=== USER ID EXTRACTION ===');
    console.log('State provided:', state ? 'YES' : 'NO');
    console.log('Extracted userId:', userId);

    if (!userId) {
      console.error('Failed to extract userId from state');
      return NextResponse.redirect(
        new URL('/dashboard?error=Invalid session', request.url)
      );
    }

    console.log('=== STORING TOKEN ===');
    console.log('Storing for user:', userId);

    // Store token in database
    await storeGooglePhotosToken(userId, access_token, refresh_token, expires_in);

    console.log('=== TOKEN STORED SUCCESSFULLY ===');

    // Get user's first project to redirect back to
    const userProject = await prisma.project.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const redirectUrl = userProject
      ? `/project/${userProject.id}?success=Google Photos connected successfully`
      : '/dashboard?success=Google Photos connected successfully';

    // Redirect back to project with success
    return NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.redirect(
      new URL('/dashboard?error=Authentication failed', request.url)
    );
  }
}

