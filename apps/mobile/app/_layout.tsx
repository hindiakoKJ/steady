import { useEffect, useState } from 'react'
import { Stack, SplashScreen } from 'expo-router'
import { useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { authStorage } from '@/lib/auth'
import { registerForPushNotifications } from '@/lib/notifications'

// Keep the native splash screen visible while we check auth.
// expo-router will auto-hide it once the root layout renders,
// but we re-prevent it here so we control the timing.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const [appIsReady, setAppIsReady] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const loggedIn = await authStorage.isLoggedIn()
        const inAuthGroup = segments[0] === 'auth'

        if (!loggedIn && !inAuthGroup) {
          router.replace('/auth/login')
        } else if (loggedIn && inAuthGroup) {
          router.replace('/(tabs)')
        }
        if (loggedIn) {
          // Register for push notifications silently after auth — non-blocking
          registerForPushNotifications().catch(() => {})
        }
      } catch {
        // Auth check failed — default to login
        router.replace('/auth/login')
      } finally {
        setAppIsReady(true)
      }
    }
    checkAuth()
  }, [segments])

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [appIsReady])

  // IMPORTANT: Never return null from the root layout.
  // expo-router needs <Stack> to always be present to initialize the
  // navigation tree. The native splash screen covers the UI during
  // the async auth check above.
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
