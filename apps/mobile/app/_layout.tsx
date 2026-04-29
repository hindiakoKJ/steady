import { Component, type ReactNode } from 'react'
import { View, Text } from 'react-native'
import { Stack, SplashScreen } from 'expo-router'

// Keep native splash visible until auth check resolves in index.tsx
SplashScreen.preventAutoHideAsync().catch(() => {})

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
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  )
}
