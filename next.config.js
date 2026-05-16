/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zenformed/core'],
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
