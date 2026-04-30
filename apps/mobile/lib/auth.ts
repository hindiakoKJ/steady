import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

// JWT stored in the device secure keystore — encrypted at rest on Android/iOS
const SECURE_KEY = 'steady_token'

// Non-sensitive session metadata stays in AsyncStorage
const KEYS = {
  HOUSEHOLD_ID:      '@steady/householdId',
  PATIENT_ID:        '@steady/currentPatientId',
  PATIENT_NICKNAME:  '@steady/currentPatientNickname',
} as const

export const authStorage = {
  async saveSession(token: string, householdId: string, patientId: string, patientNickname: string) {
    await Promise.all([
      SecureStore.setItemAsync(SECURE_KEY, token),
      AsyncStorage.multiSet([
        [KEYS.HOUSEHOLD_ID,     householdId],
        [KEYS.PATIENT_ID,       patientId],
        [KEYS.PATIENT_NICKNAME, patientNickname],
      ]),
    ])
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(SECURE_KEY)
  },

  async getHouseholdId(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.HOUSEHOLD_ID)
  },

  async getCurrentPatient(): Promise<{ id: string; nickname: string } | null> {
    const [id, nickname] = await AsyncStorage.multiGet([KEYS.PATIENT_ID, KEYS.PATIENT_NICKNAME])
    if (!id[1] || !nickname[1]) return null
    return { id: id[1], nickname: nickname[1] }
  },

  async setCurrentPatient(id: string, nickname: string) {
    await AsyncStorage.multiSet([
      [KEYS.PATIENT_ID,       id],
      [KEYS.PATIENT_NICKNAME, nickname],
    ])
  },

  async clearSession() {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_KEY),
      AsyncStorage.multiRemove(Object.values(KEYS)),
    ])
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(SECURE_KEY)
    return token !== null
  },
}
