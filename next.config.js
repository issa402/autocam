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


};

module.exports = nextConfig;

