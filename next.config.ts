import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID:
      process.env.GOOGLE_ADS_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID ||
      '1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg.apps.googleusercontent.com',
  },
  async redirects() {
    return [
      { source: '/automation', destination: '/automations', permanent: true },
      { source: '/overview', destination: '/dashboard', permanent: true },
      { source: '/copilot', destination: '/chat', permanent: true },
      { source: '/insights', destination: '/audit', permanent: true },
    ];
  },
  // Allow access to remote image placeholder and Google auth avatars.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && (process.env.DISABLE_HMR === 'true' || process.env.DISABLE_HMR === undefined)) {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
