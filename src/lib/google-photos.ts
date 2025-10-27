/**
 * Google Photos Integration
 * Handles uploading photos to Google Photos albums
 */

import axios from 'axios';
import prisma from '@/lib/prisma';

interface GooglePhotosConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Get or refresh Google Photos access token
 */
export async function getGooglePhotosToken(userId: string): Promise<string> {
  // Get stored token from database
  const oauthToken = await prisma.oAuthToken.findFirst({
    where: {
      userId,
      provider: 'google-photos',
    },
  });

  if (!oauthToken) {
    console.error('No OAuth token found for user:', userId);
    console.error('Available tokens:', await prisma.oAuthToken.findMany({
      where: { userId },
      select: { provider: true, createdAt: true }
    }));
    throw new Error('Google Photos not connected. Please authenticate first.');
  }

  console.log('Found OAuth token, checking expiration...');
  console.log('Token expires at:', oauthToken.expiresAt);
  console.log('Current time:', new Date());

  // Check if token is expired
  if (oauthToken.expiresAt && new Date() > oauthToken.expiresAt) {
    console.log('Token expired, refreshing...');
    // Refresh token
    if (!oauthToken.refreshToken) {
      throw new Error('Cannot refresh token - no refresh token stored');
    }

    const newToken = await refreshGooglePhotosToken(userId, oauthToken.refreshToken);
    return newToken;
  }

  console.log('Token is valid, using it');
  return oauthToken.accessToken;
}

/**
 * Refresh Google Photos access token
 */
async function refreshGooglePhotosToken(userId: string, refreshToken: string): Promise<string> {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env['GOOGLE_CLIENT_ID'],
      client_secret: process.env['GOOGLE_CLIENT_SECRET'],
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in } = response.data;

    // Find the token record first
    const existingToken = await prisma.oAuthToken.findFirst({
      where: { userId, provider: 'google-photos' },
    });

    if (!existingToken) {
      throw new Error('Token record not found');
    }

    // Update token in database
    await prisma.oAuthToken.update({
      where: { id: existingToken.id },
      data: {
        accessToken: access_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });

    return access_token;
  } catch (error) {
    console.error('Error refreshing Google Photos token:', error);
    throw new Error('Failed to refresh Google Photos token');
  }
}

/**
 * Create or get Google Photos album
 * Returns object with id and productUrl
 */
export async function getOrCreateAlbum(
  accessToken: string,
  albumName: string
): Promise<{ id: string; productUrl: string }> {
  try {
    console.log('Getting or creating album:', albumName);

    // List existing albums
    const listResponse = await axios.get('https://photoslibrary.googleapis.com/v1/albums', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        pageSize: 50,
      },
    });

    console.log('Albums response:', listResponse.data);

    // Check if album already exists
    const existingAlbum = listResponse.data.albums?.find(
      (album: any) => album.title === albumName
    );

    if (existingAlbum) {
      console.log('Found existing album:', existingAlbum.id);
      return {
        id: existingAlbum.id,
        productUrl: existingAlbum.productUrl || `https://photos.google.com/lr/album/${existingAlbum.id}`,
      };
    }

    // Create new album
    console.log('Creating new album:', albumName);
    const createResponse = await axios.post(
      'https://photoslibrary.googleapis.com/v1/albums',
      {
        album: {
          title: albumName,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Album created:', createResponse.data);
    return {
      id: createResponse.data.id,
      productUrl: createResponse.data.productUrl || `https://photos.google.com/lr/album/${createResponse.data.id}`,
    };
  } catch (error: any) {
    console.error('Error creating/getting album:', error.response?.data || error.message);
    throw new Error(`Failed to create or get album: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Upload photos to Google Photos album
 */
export async function uploadPhotosToGooglePhotos(
  userId: string,
  photoUrls: string[],
  albumName: string
): Promise<{ success: boolean; albumId: string; albumUrl: string; uploadedCount: number }> {
  try {
    console.log('Starting upload for user:', userId, 'photos:', photoUrls.length);

    // Get access token
    const accessToken = await getGooglePhotosToken(userId);
    console.log('Got access token');

    // Get or create album
    console.log('Creating/getting album with name:', albumName);
    const album = await getOrCreateAlbum(accessToken, albumName);
    const albumId = album.id;
    console.log('✅ Got album ID:', albumId);
    console.log('✅ Album product URL:', album.productUrl);

    // Upload each photo sequentially to avoid race conditions
    let uploadedCount = 0;
    const uploadResults: { success: boolean; error?: string }[] = [];

    for (let index = 0; index < photoUrls.length; index++) {
      const photoUrl = photoUrls[index];
      try {
        console.log(`Uploading photo ${index + 1}/${photoUrls.length}`);

        // Download photo from Supabase
        const photoResponse = await axios.get(photoUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        console.log(`Downloaded photo ${index + 1}, size: ${photoResponse.data.length} bytes`);

        // Upload to Google Photos
        const uploadResponse = await axios.post(
          'https://photoslibrary.googleapis.com/v1/uploads',
          photoResponse.data,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/octet-stream',
              'X-Goog-Upload-File-Name': `photo-${Date.now()}-${index}.jpg`,
            },
            timeout: 30000,
          }
        );

        // The upload token is returned in the response body as a string
        const uploadToken = uploadResponse.data;
        console.log(`Uploaded photo ${index + 1}, token:`, uploadToken?.substring(0, 20));

        // Add to album
        if (uploadToken) {
          console.log(`Adding photo ${index + 1} to album ${albumId}...`);
          const addResponse = await axios.post(
            `https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate`,
            {
              albumId,
              newMediaItems: [
                {
                  description: 'Uploaded from AutoCam',
                  simpleMediaItem: {
                    uploadToken: uploadToken,
                  },
                },
              ],
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            }
          );

          console.log(`Add response for photo ${index + 1}:`, addResponse.data);
          uploadedCount++;
          uploadResults.push({ success: true });
          console.log(`✅ Added photo ${index + 1} to album`);
        } else {
          console.error(`No upload token for photo ${index + 1}`);
          uploadResults.push({ success: false, error: 'No upload token' });
        }
      } catch (error: any) {
        console.error(`Error uploading photo ${index + 1}:`, error.response?.data || error.message);
        uploadResults.push({ success: false, error: error.message });
      }
    }

    console.log('Upload complete, uploaded:', uploadedCount, 'photos');
    console.log('Upload results:', uploadResults);

    return {
      success: true,
      albumId,
      albumUrl: album.productUrl,
      uploadedCount,
    };
  } catch (error: any) {
    console.error('Error uploading to Google Photos:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Store Google Photos OAuth token
 */
export async function storeGooglePhotosToken(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  // First check if token exists
  const existingToken = await prisma.oAuthToken.findFirst({
    where: { userId, provider: 'google-photos' },
  });

  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  if (existingToken) {
    // Update existing token
    await prisma.oAuthToken.update({
      where: { id: existingToken.id },
      data: {
        accessToken,
        refreshToken,
        expiresAt,
      },
    });
  } else {
    // Create new token
    await prisma.oAuthToken.create({
      data: {
        userId,
        provider: 'google-photos',
        accessToken,
        refreshToken,
        expiresAt,
      },
    });
  }
}

