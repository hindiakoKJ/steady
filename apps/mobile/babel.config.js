module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Inline EXPO_ROUTER_APP_ROOT as a string literal for monorepo builds.
      // expo-router's _ctx.android.js uses require.context(process.env.EXPO_ROUTER_APP_ROOT)
      // which requires a static string — this replaces it at Babel transform time.
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
                path.replaceWith(t.stringLiteral('app'))
              }
              if (
                t.isMemberExpression(path.node.object) &&
                t.isIdentifier(path.node.object.object, { name: 'process' }) &&
                t.isIdentifier(path.node.object.property, { name: 'env' }) &&
                t.isIdentifier(path.node.property, { name: 'EXPO_ROUTER_IMPORT_MODE' })
              ) {
                path.replaceWith(t.stringLiteral('sync'))
              }
            },
          },
        }
      },
    ],
  }
}
