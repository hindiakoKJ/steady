// Expo config plugin: suppress the AGP "untested compileSdk" warning.
//
// Expo SDK 53 ships Android Gradle Plugin 8.8.x, which is tested only up to
// compileSdk 35. We compile against 36 (required: Play mandates targetSdk 36
// by Aug 31, 2026, and target > compile is invalid), so AGP asks for this
// gradle.properties opt-in to acknowledge the newer SDK.
const { withGradleProperties } = require('expo/config-plugins')

const KEY = 'android.suppressUnsupportedCompileSdk'

module.exports = function withSuppressCompileSdkWarning(config) {
  return withGradleProperties(config, (config) => {
    const existing = config.modResults.find(
      (item) => item.type === 'property' && item.key === KEY,
    )
    if (existing) {
      existing.value = '36'
    } else {
      config.modResults.push({ type: 'property', key: KEY, value: '36' })
    }
    return config
  })
}
