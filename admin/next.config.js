/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: 'https',
        hostname :"uwja77bygk2kgfqe.public.blob.vercel-storage.com",

      }
    ],
  },
};

module.exports = nextConfig
