const appJson = require('./app.json')

// Google Maps Android key — safe to hardcode (key is in the APK anyway;
// security comes from API restrictions + app signing in Google Cloud Console)
const GOOGLE_MAPS_KEY = 'AIzaSyBRsM6n5vh5Mnd7t1XS_xFV-VSBeN8mRnk'

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_KEY,
        },
      },
    },
  },
}
