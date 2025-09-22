/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'avatars.githubusercontent.com', 
      'lh3.googleusercontent.com',
      'res.cloudinary.com', // Cloudinary images
      's3.amazonaws.com',   // AWS S3 images
      'helpmeapply-bucket.s3.amazonaws.com' // Your S3 bucket
    ],
  },
  // Enable standalone build for deployment optimization
  output: 'standalone',
  // Optimize for production
  poweredByHeader: false,
  compress: true,
  // Handle potential large file uploads
  serverExternalPackages: ['@prisma/client']
}

module.exports = nextConfig