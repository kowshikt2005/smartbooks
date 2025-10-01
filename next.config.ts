import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'lucide-react', 'recharts']
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif']
  }
};

export default nextConfig;
