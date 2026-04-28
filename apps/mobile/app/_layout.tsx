import { useEffect } from 'react'
import { Stack, SplashScreen, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { authStorage } from '@/lib/auth'
import { registerForPushNotifications } from '@/lib/notifications'

// Prevent the native splash from auto-hiding before we finish the auth check.
SplashScreen.preventAutoHideAsync()

// Set up the notification handler here so it runs once, at the module level,
// but AFTER expo-splash-screen has been initialized.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export default function RootLayout() {
  const router = useRouter()

  useEffect(() => {
    // Run the auth check ONCE on mount.
    // We deliberately do NOT include router or segments in the dependency
    // array — we only want this to run once, not on every navigation event.
    const bootstrap = async () => {
      try {
        const loggedIn = await authStorage.isLoggedIn()
        if (loggedIn) {
          // Already signed in — register push silently
          registerForPushNotifications().catch(() => {})
          router.replace('/(tabs)')
        } else {
          router.replace('/auth/login')
        }
      } catch {
        // If AsyncStorage fails, default to login
        router.replace('/auth/login')
      } finally {
        // Always hide the splash once we know where to go
        SplashScreen.hideAsync().catch(() => {})
      }
    }
    bootstrap()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Always render the Stack — expo-router needs the navigator in the tree
  // from the very first render. The native splash screen covers the UI
  // while the auth check above runs asynchronously.
  return (
    <>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#0f172a' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen
          name="bystander"
          options={{
            title: 'Bystander Mode',
            presentation: 'fullScreenModal',
            headerStyle: { backgroundColor: '#ffffff' },
            headerTintColor: '#0f172a',
          }}
        />
        <Stack.Screen
          name="seizure-active"
          options={{
            title: '',
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="patient-select"
          options={{
            title: 'Switch Patient',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="contacts"
          options={{
            title: 'Emergency Contacts',
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  )
}
