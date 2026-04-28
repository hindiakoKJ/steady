import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { notificationsApi } from './api'
import { authStorage } from './auth'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const token = (await Notifications.getExpoPushTokenAsync()).data
  return token
}

export async function registerPushTokenWithApi(contactId: string) {
  const isLoggedIn = await authStorage.isLoggedIn()
  if (!isLoggedIn) return

  const token = await registerForPushNotifications()
  if (!token) return

  try {
    await notificationsApi.registerToken(token, contactId)
  } catch {
    // Non-critical — push registration failure shouldn't block the user
  }
}
