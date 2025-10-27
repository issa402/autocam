/**
 * User Registration API Endpoint
 * 
 * POST /api/auth/register
 * 
 * This endpoint creates a new user account.
 * 
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   name?: string
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
import { hashPassword, generateAccessToken, generateRefreshToken, validatePasswordStrength } from '@/lib/auth';
import { isValidEmail } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, name } = body;

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

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: passwordValidation.error,
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User with this email already exists',
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
      // Don't return password in response
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          user,
          accessToken,
          refreshToken,
        },
        message: 'User registered successfully',
      },
      { status: 201 } // 201 Created
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

