/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  allowedDevOrigins: [
    "https://6000-firebase-studio-1773587620136.cluster-v6vfua76y5hvquszcbrvi5d4oi.cloudworkstations.dev",
    "http://6000-firebase-studio-1773587620136.cluster-v6vfua76y5hvquszcbrvi5d4oi.cloudworkstations.dev"
  ]
};

module.exports = nextConfig;
