/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['fluent-ffmpeg', 'formidable'],
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
}

module.exports = nextConfig
