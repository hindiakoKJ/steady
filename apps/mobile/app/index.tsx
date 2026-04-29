import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Redirect, SplashScreen } from 'expo-router'
import { authStorage } from '@/lib/auth'

export default function Index() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    authStorage
      .isLoggedIn()
      .then((result) => setLoggedIn(result))
      .catch(() => setLoggedIn(false))
      .finally(() => SplashScreen.hideAsync().catch(() => {}))
  }, [])

  if (loggedIn === null) {
    return <View style={{ flex: 1, backgroundColor: '#0f172a' }} />
  }

  return <Redirect href={loggedIn ? '/(tabs)' : '/auth/login'} />
}
