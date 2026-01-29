/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    isrMemoryCacheSize: 0, // Disable ISR cache to prevent memory issues with large uploads
  },
}

module.exports = nextConfig
