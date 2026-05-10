import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STEADY } from '@repo/ui'
import { registerForPushNotifications } from '@/lib/notifications'

export const PUSH_TOKEN_KEY = '@steady/expoPushToken'

export default function TabLayout() {
  // Request push permission once when the authenticated shell mounts.
  // Token is stored locally; household members link their device via Contacts screen.
  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => {})
    })
  }, [])
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: STEADY.bg.darkSurface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: STEADY.border.dark,
          paddingTop: 8,
          paddingBottom: 24,
          height: 72,
        },
        tabBarActiveTintColor: STEADY.accent.base,
        tabBarInactiveTintColor: STEADY.ink.onDarkTer,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Emergency',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nearby-doctors"
        options={{
          title: 'Doctors',
          tabBarIcon: ({ color, size }) => <Ionicons name="medical-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
