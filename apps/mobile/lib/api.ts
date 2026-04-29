import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  CreateSeizureLogRequest,
  EndSeizureLogRequest,
  SeizureLog,
  Patient,
  CreatePatientRequest,
  EmergencyContact,
  CreateEmergencyContactRequest,
} from '@repo/types'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

const client = axios.create({ baseURL: API_URL })

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@steady/token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', body).then((r) => r.data),

  login: (body: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', body).then((r) => r.data),
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export const patientsApi = {
  list: () => client.get<Patient[]>('/patients').then((r) => r.data),
  create: (body: CreatePatientRequest) =>
    client.post<Patient>('/patients', body).then((r) => r.data),
}

// ─── Seizure Logs ─────────────────────────────────────────────────────────────

export const seizureLogsApi = {
  start: (body: CreateSeizureLogRequest) =>
    client.post<SeizureLog>('/seizure-logs', body).then((r) => r.data),

  end: (id: string, body: EndSeizureLogRequest) =>
    client.patch<SeizureLog>(`/seizure-logs/${id}`, body).then((r) => r.data),

  list: (patientId: string) =>
    client.get<SeizureLog[]>('/seizure-logs', { params: { patientId } }).then((r) => r.data),

  fireBeacon: (id: string, lat?: number, lon?: number) =>
    client
      .post<SeizureLog>(`/seizure-logs/${id}/beacon`, { latitude: lat, longitude: lon })
      .then((r) => r.data),
}

// ─── Emergency Contacts ───────────────────────────────────────────────────────

export const contactsApi = {
  list: () => client.get<EmergencyContact[]>('/contacts').then((r) => r.data),
  create: (body: CreateEmergencyContactRequest) =>
    client.post<EmergencyContact>('/contacts', body).then((r) => r.data),
  delete: (id: string) => client.delete(`/contacts/${id}`).then((r) => r.data),
}

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  registerToken: (pushToken: string, contactId: string) =>
    client.post('/notifications/token', { pushToken, contactId }).then((r) => r.data),
}
