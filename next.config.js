/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained server in .next/standalone (used by the Dockerfile)
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pdf-parse'],
}

module.exports = nextConfig
