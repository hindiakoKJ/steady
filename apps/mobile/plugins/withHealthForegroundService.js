// Expo config plugin: declare react-native-background-actions' service with
// foregroundServiceType="health" in the merged AndroidManifest.
//
// Why: on Android 14+ (API 34+) every foreground service must declare a type
// both in the manifest AND when calling startForeground(). The library's own
// manifest declares the service with no type, so we add the attribute here.
// "health" is the semantically-correct type for continuous seizure monitoring
// and has no runtime timeout (unlike dataSync's 6h/24h cap on Android 15+).
// Its permission prerequisite is satisfied by declaring HIGH_SAMPLING_RATE_SENSORS
// (install-time, no user prompt) — see android.permissions in app.json.
//
// On Android 10–13 devices the attribute and the FOREGROUND_SERVICE_HEALTH
// permission are simply ignored, so one manifest serves API 29–36.
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins')

const SERVICE_NAME = 'com.asterinet.react.bgactions.RNBackgroundActionsTask'

module.exports = function withHealthForegroundService(config) {
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults)
    app.service = app.service || []

    let service = app.service.find((s) => s.$['android:name'] === SERVICE_NAME)
    if (!service) {
      service = { $: { 'android:name': SERVICE_NAME } }
      app.service.push(service)
    }
    service.$['android:foregroundServiceType'] = 'health'
    service.$['android:exported'] = 'false'

    return config
  })
}
