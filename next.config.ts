import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
    optimizeFonts: false,
  },
};

export default nextConfig;
