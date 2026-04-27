import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
  TOKEN: '@steady/token',
  HOUSEHOLD_ID: '@steady/householdId',
  PATIENT_ID: '@steady/currentPatientId',
  PATIENT_NICKNAME: '@steady/currentPatientNickname',
} as const

export const authStorage = {
  async saveSession(token: string, householdId: string, patientId: string, patientNickname: string) {
    await AsyncStorage.multiSet([
      [KEYS.TOKEN, token],
      [KEYS.HOUSEHOLD_ID, householdId],
      [KEYS.PATIENT_ID, patientId],
      [KEYS.PATIENT_NICKNAME, patientNickname],
    ])
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.TOKEN)
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
      [KEYS.PATIENT_ID, id],
      [KEYS.PATIENT_NICKNAME, nickname],
    ])
  },

  async clearSession() {
    await AsyncStorage.multiRemove(Object.values(KEYS))
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await AsyncStorage.getItem(KEYS.TOKEN)
    return token !== null
  },
}
