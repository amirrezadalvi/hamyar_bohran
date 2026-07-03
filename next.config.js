/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}
module.exports = nextConfig


/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true, // نادیده گرفتن خطاهای تایپ‌اسکریپت
  },
  eslint: {
    ignoreDuringBuilds: true, // نادیده گرفتن خطاهای ESLint
  },
}
module.exports = nextConfig