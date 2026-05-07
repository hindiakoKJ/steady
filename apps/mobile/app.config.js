const appJson = require('./app.json')

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [
      ...appJson.expo.plugins,
      [
        'react-native-maps',
        {
          googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '',
        },
      ],
    ],
  },
}
