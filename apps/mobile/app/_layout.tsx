import { Component, useEffect, type ReactNode } from 'react'
import { View, Text } from 'react-native'
import { Stack, SplashScreen, router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Keep native splash visible until auth check resolves in index.tsx
SplashScreen.preventAutoHideAsync().catch(() => {})

// ─── Notification tap → navigation ───────────────────────────────────────────
// The Android background monitor fires local notifications (countdown, BEACON
// fired). Tapping one whose data asks for seizure-active navigates there —
// guarded on an active log so stale notification history can't misnavigate.
function useNotificationNavigation() {
  useEffect(() => {
    const navigate = async (response: Notifications.NotificationResponse | null) => {
      const screen = response?.notification.request.content.data?.screen
      if (screen !== 'seizure-active') return
      const activeId = await AsyncStorage.getItem('@steady/activeSeizureLogId')
      if (!activeId) return
      const startedAt = await AsyncStorage.getItem('@steady/activeSeizureStartedAt')
      router.push({
        pathname: '/seizure-active',
        params: startedAt ? { startedAt } : undefined,
      })
    }

    // Cold start from a notification tap — small delay so the auth gate in
    // app/index.tsx settles before we push on top of it. The response is
    // cleared once consumed: the FGS keeps the process alive for days, so an
    // uncleared response would replay on every later activity recreation.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return
        Notifications.clearLastNotificationResponseAsync().catch(() => {})
        setTimeout(() => navigate(response), 600)
      })
      .catch(() => {})

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigate(response)
      Notifications.clearLastNotificationResponseAsync().catch(() => {})
    })
    return () => sub.remove()
  }, [])
}

// ─── Visible error boundary ──────────────────────────────────────────────────
interface EBState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null }
  static getDerivedStateFromError(error: Error): EBState {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0f172a' }}>
          <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
            ⚠️ App crashed
          </Text>
          <Text style={{ color: '#fca5a5', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            {String(this.state.error)}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 11, marginTop: 16, textAlign: 'center' }}>
            Screenshot this and share for debugging.
          </Text>
        </View>
      )
    }
    return this.props.children
  }
}

export default function RootLayout() {
  useNotificationNavigation()
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  )
}
