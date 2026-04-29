import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/types'],
  webpack(config) {
    // In a monorepo, multiple node_modules trees can cause Next.js to load
    // react and react-dom from different locations, crashing with a version
    // mismatch. Force both to resolve from the single root node_modules copy.
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
    }
    return config
  },
}

export default nextConfig
