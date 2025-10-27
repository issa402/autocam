/**
 * Next.js Configuration File
 * 
 * This file configures Next.js behavior including:
 * - API route body size limits (for large photo uploads)
 * - Image optimization domains (for external images)
 * - Webpack configuration
 * - Environment variables
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  // Helps catch potential problems in the application
  reactStrictMode: true,

  // Configure image optimization
  images: {
    // Allow images from these domains to be optimized by Next.js
    // Add your R2/S3 domain here
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev', // Cloudflare R2
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com', // AWS S3
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },

  // API route configuration
  // Increase body size limit to handle large photo uploads
  api: {
    bodyParser: {
      sizeLimit: '100mb', // Allow up to 100MB uploads
    },
    // Disable response size limit for large photo downloads
    responseLimit: false,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for canvas module (used by some image processing libraries)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    return config;
  },

  // Environment variables exposed to the browser
  // Only variables prefixed with NEXT_PUBLIC_ are exposed
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
};

module.exports = nextConfig;

