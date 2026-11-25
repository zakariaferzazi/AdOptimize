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
      { source: '/overview', destination: '/dashboard', permanent: true },
      { source: '/copilot', destination: '/chat', permanent: true },
      { source: '/insights', destination: '/audit', permanent: true },
    ];
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
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
  webpack: (config, {dev, isServer}) => {
    // Alias web-streams-polyfill ponyfill for fetch-blob / gaxios compatibility
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      'web-streams-polyfill/dist/ponyfill.es2018.js': 'web-streams-polyfill',
    };

    if (isServer) {
      // Firebase's Node Firestore build loads gRPC/protobuf codegen, which Workers forbid.
      config.module.rules.push({
        test: /[\\/]node_modules[\\/](?:@firebase|firebase)[\\/]/,
        resolve: { conditionNames: ['browser', 'import', 'default'] },
      });
    }

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
