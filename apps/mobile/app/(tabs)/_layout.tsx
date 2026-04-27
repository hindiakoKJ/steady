import { StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { Shield, Clock, Settings } from 'lucide-react-native'
import { STEADY } from '@repo/ui'

export default function TabLayout() {
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
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
