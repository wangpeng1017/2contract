/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['crypto-js']
  },
  images: {
    domains: ['lf3-static.bytednsdoc.com', 'sf3-cn.feishucdn.com']
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  }
}

module.exports = nextConfig
