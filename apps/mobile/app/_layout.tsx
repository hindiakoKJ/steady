import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { authStorage } from '@/lib/auth'
import { registerForPushNotifications } from '@/lib/notifications'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
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
      setChecked(true)
    }
    checkAuth()
  }, [segments])

  if (!checked) return null

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
