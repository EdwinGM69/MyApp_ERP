/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '**',
      },
    ],
  },
  // Security headers and CORS
  async headers() {
    const headers = [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // API routes - minimal security headers
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]

    // Add CORS headers for production
    if (process.env.NODE_ENV === 'production') {
      headers.push({
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || 'https://your-production-domain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-csrf-token' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      })
    }

    return headers
  },
  // Redirect HTTP to HTTPS in production
  async redirects() {
    return process.env.NODE_ENV === 'production'
      ? [
          {
            source: '/((?!api/).*)',
            destination: 'https://:host/:path*',
            permanent: true,
            has: [
              {
                type: 'header',
                key: 'x-forwarded-proto',
                value: 'http',
              },
            ],
          },
        ]
      : []
  },
}

module.exports = nextConfig
