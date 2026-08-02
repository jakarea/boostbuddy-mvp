import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Prevent Turbopack from bundling native modules; they're required at runtime only when DB_MODE === 'local'.
  // This makes the app deployable on Vercel (serverless) where native addons like better-sqlite3 cannot run.
  serverExternalPackages: ['better-sqlite3'],

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@/components/ui',
    ],
  },
};

export default nextConfig;
