import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { notificationsApi } from './api'

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Request permission and return the Expo push token.
 * Returns null if permission is denied or the device doesn't support push.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications don't work on Android emulators without FCM setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('beacon', {
      name: 'BEACON Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8312B',
      sound: 'default',
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '474071af-a82b-4d86-8e8b-b0e2c080db77',
    })
    return tokenData.data
  } catch {
    return null
  }
}

/**
 * Register the push token with the backend so the server can
 * send BEACON push alerts to this device's contact entry.
 */
export async function registerPushTokenWithApi(contactId: string): Promise<void> {
  const token = await registerForPushNotifications()
  if (!token) return
  try {
    await notificationsApi.registerToken(token, contactId)
  } catch {
    // Non-critical — push won't work but SMS still will
  }
}
