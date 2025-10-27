/**
 * Prisma Client Singleton
 *
 * This file creates a single instance of Prisma Client that's reused across the application.
 *
 * Why a singleton?
 * - Prevents multiple database connections in development (hot reload creates new instances)
 * - Improves performance
 * - Prevents "too many connections" errors
 *
 * How it works:
 * - In production: Creates one instance
 * - In development: Stores instance in global object to survive hot reloads
 */

import 'server-only';

import { PrismaClient } from '@prisma/client';

// Extend global object to store Prisma instance in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Create Prisma Client instance
 * 
 * Configuration:
 * - log: Logs database queries in development for debugging
 */
const prisma = global.prisma || new PrismaClient({
  log: (process.env['NODE_ENV'] === 'development') ? ['query', 'error', 'warn'] : ['error'],
});

// In development, store instance in global to survive hot reloads
if (process.env['NODE_ENV'] !== 'production') {
  global.prisma = prisma;
}

export default prisma;

