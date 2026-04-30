const path = require('path')

// Metro's require.context() resolves its path argument relative to the FILE
// that contains the call — which is node_modules/expo-router/_ctx.android.js.
// We compute the relative path from that file's directory to our app/ folder
// so Metro finds the correct routes regardless of absolute system paths.
const expoRouterDir = path.resolve(__dirname, '../../node_modules/expo-router')
const appDir = path.resolve(__dirname, 'app')
const APP_ROOT = path.relative(expoRouterDir, appDir).replace(/\\/g, '/')
// → '../../apps/mobile/app'

module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      function ({ types: t }) {
        return {
          visitor: {
            MemberExpression (path) {
              if (
                t.isMemberExpression(path.node.object) &&
                t.isIdentifier(path.node.object.object, { name: 'process' }) &&
                t.isIdentifier(path.node.object.property, { name: 'env' }) &&
                t.isIdentifier(path.node.property, { name: 'EXPO_ROUTER_APP_ROOT' })
              ) {
                path.replaceWith(t.stringLiteral(APP_ROOT))
              }
              if (
                t.isMemberExpression(path.node.object) &&
                t.isIdentifier(path.node.object.object, { name: 'process' }) &&
                t.isIdentifier(path.node.object.property, { name: 'env' }) &&
                t.isIdentifier(path.node.property, { name: 'EXPO_ROUTER_IMPORT_MODE' })
              ) {
                path.replaceWith(t.stringLiteral('lazy'))
              }
            },
          },
        }
      },
    ],
  }
}
