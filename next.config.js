/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone build: alleen de benodigde bestanden in .next/standalone,
  // zodat het Docker-image klein blijft (zie Dockerfile)
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
}

module.exports = nextConfig
