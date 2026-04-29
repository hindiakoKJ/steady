import { requireNativeModule } from 'expo-modules-core'

// Only available in native builds — not in Expo Go.
// Callers should guard with Platform.OS === 'android' before calling.
let AndroidSms = null
try {
  AndroidSms = requireNativeModule('AndroidSms')
} catch {
  // Expo Go or iOS — module not available
}

export async function sendSMS(phoneNumber, message) {
  if (!AndroidSms) throw new Error('AndroidSms native module not available')
  return AndroidSms.sendSMS(phoneNumber, message)
}

export const isAvailable = AndroidSms != null
