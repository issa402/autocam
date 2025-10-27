/**
 * User Login API Endpoint
 * 
 * POST /api/auth/login
 * 
 * This endpoint authenticates a user and returns JWT tokens.
 * 
 * Request body:
 * {
 *   email: string,
 *   password: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     user: { id, email, name },
 *     accessToken: string,
 *     refreshToken: string
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // User not found
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 } // 401 Unauthorized
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return success response (without password)
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

