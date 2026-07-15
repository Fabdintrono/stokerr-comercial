/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    allowedDevOrigins: ['192.168.1.107'],
  },
}

module.exports = nextConfig