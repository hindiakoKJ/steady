const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

// Ensure expo-router knows where the app directory is in the monorepo
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, 'app')

const config = getDefaultConfig(projectRoot)

// Watch the entire monorepo so Metro can resolve @repo/* packages
// Merge with Expo's defaults instead of replacing them
config.watchFolders = [...(config.watchFolders || []), workspaceRoot]

// Look for node_modules in both mobile and root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

module.exports = config
