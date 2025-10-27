/**
 * Authentication Service
 *
 * This service handles user authentication:
 * - Password hashing
 * - JWT token generation and verification
 * - User session management
 *
 * Why JWT?
 * - Stateless (no server-side session storage)
 * - Scalable (works across multiple servers)
 * - Secure (signed with secret key)
 * - Contains user info (no database lookup needed)
 *
 * Security measures:
 * - Passwords hashed with bcrypt (10 rounds)
 * - JWT tokens expire after 15 minutes
 * - Refresh tokens for long-term sessions
 */

'use server';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@/types';

/**
 * JWT secret key from environment
 * IMPORTANT: Change this in production!
 */
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * JWT payload structure
 */
interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

/**
 * Hashes a password using bcrypt
 * 
 * Why bcrypt?
 * - Slow by design (prevents brute force attacks)
 * - Includes salt (prevents rainbow table attacks)
 * - Industry standard
 * 
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  // 10 rounds = good balance of security and performance
  // Higher rounds = more secure but slower
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  return hashed;
}

/**
 * Verifies a password against a hash
 * 
 * @param password - Plain text password
 * @param hash - Hashed password from database
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generates a JWT access token
 * 
 * Access tokens are short-lived (15 minutes)
 * Used for API authentication
 * 
 * @param user - User object
 * @returns JWT token
 */
export function generateAccessToken(user: { id: string; email: string }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  } as any);
}

/**
 * Generates a JWT refresh token
 * 
 * Refresh tokens are long-lived (7 days)
 * Used to get new access tokens without re-login
 * 
 * @param user - User object
 * @returns JWT refresh token
 */
export function generateRefreshToken(user: { id: string; email: string }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as any);
}

/**
 * Verifies a JWT token
 * 
 * @param token - JWT token to verify
 * @returns Decoded payload if valid, null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Extracts user ID from JWT token
 * 
 * @param token - JWT token
 * @returns User ID or null
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = verifyToken(token);
  return payload ? payload.userId : null;
}

/**
 * Validates password strength
 * 
 * Requirements:
 * - At least 8 characters
 * - Contains uppercase letter
 * - Contains lowercase letter
 * - Contains number
 * 
 * @param password - Password to validate
 * @returns Object with isValid and error message
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one lowercase letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one number',
    };
  }

  return { isValid: true };
}

/**
 * Extracts bearer token from Authorization header
 * 
 * Authorization header format: "Bearer <token>"
 * 
 * @param authHeader - Authorization header value
 * @returns Token or null
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Middleware helper to get authenticated user from request
 * 
 * @param authHeader - Authorization header
 * @returns User ID or null
 */
export function getAuthenticatedUserId(authHeader: string | null): string | null {
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  
  return getUserIdFromToken(token);
}

