
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'ifdhcwsigjankvidokko.supabase.co',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // This is a workaround for the large file size issue on Cloudflare Pages.
    // It forces Webpack to use a filesystem-based cache that creates smaller, individual files
    // instead of a single large .pack file that exceeds Cloudflare's 25 MiB limit.
    if (!isServer) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
