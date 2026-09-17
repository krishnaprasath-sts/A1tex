/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:5173'
    return [
      {
        source: '/admin',
        destination: adminUrl,
        permanent: false,
      },
      {
        source: '/panel',
        destination: adminUrl,
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: adminUrl,
        permanent: false,
      },
    ]
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005'
    const base = apiUrl.replace(/\/api$/, '') || 'http://localhost:5005'
    return [
      {
        source: '/api/:path*',
        destination: `${base}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${base}/uploads/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
