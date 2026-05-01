// ─── Auth ───────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string
  password: string
  householdAlias: string
  patientNickname: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  householdId: string
  patientId: string
  patientNickname: string
}

// ─── Patient ─────────────────────────────────────────────────────────────────

export interface Patient {
  id: string
  nickname: string
  birthYear?: number
  notes?: string
  householdId: string
  createdAt: string
}

export interface CreatePatientRequest {
  nickname: string
  birthYear?: number
  notes?: string
}

// ─── Seizure Log ─────────────────────────────────────────────────────────────

export type SeizureTrigger =
  | 'missed_meds'
  | 'stress'
  | 'sleep'
  | 'heat'
  | 'illness'
  | 'flashing_lights'
  | 'alcohol'
  | 'menstrual'
  | 'unknown'

export type SeizureType =
  | 'tonic-clonic'
  | 'absence'
  | 'focal'
  | 'myoclonic'
  | 'unknown'

export type SeizureTriggerSource = 'AURA' | 'BEACON' | 'PASSIVE' | 'MANUAL'

export interface SeizureLog {
  id: string
  patientId: string
  householdId: string
  startedAt: string
  endedAt?: string
  durationSeconds?: number

  triggeredBy?: SeizureTriggerSource
  isFalseAlarm: boolean

  seizureType?: SeizureType
  triggers: SeizureTrigger[]
  consciousnessLost?: boolean
  injuryOccurred?: boolean
  postictalMinutes?: number

  weatherTempC?: number
  weatherCondition?: string
  weatherHumidity?: number
  latitude?: number
  longitude?: number
  beaconFiredAt?: string

  notes?: string
  createdAt: string
}

export interface CreateSeizureLogRequest {
  patientId: string
  startedAt: string
  triggeredBy?: SeizureTriggerSource
  weatherTempC?: number
  weatherCondition?: string
  weatherHumidity?: number
  latitude?: number
  longitude?: number
}

export interface EndSeizureLogRequest {
  endedAt: string
  isFalseAlarm?: boolean
  seizureType?: SeizureType
  triggers?: SeizureTrigger[]
  consciousnessLost?: boolean
  injuryOccurred?: boolean
  postictalMinutes?: number
  notes?: string
  // Weather captured in background during seizure
  weatherTempC?: number
  weatherCondition?: string
  weatherHumidity?: number
  latitude?: number
  longitude?: number
}

export interface FireBeaconRequest {
  latitude?: number
  longitude?: number
}

// ─── Emergency Contact ───────────────────────────────────────────────────────

export interface EmergencyContact {
  id: string
  householdId: string
  nickname: string
  phoneNumber?: string
  pushToken?: string
}

export interface CreateEmergencyContactRequest {
  nickname: string
  phoneNumber?: string
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export interface WeatherData {
  tempC: number
  condition: string
  humidity: number
  lat: number
  lon: number
}

// ─── Language ────────────────────────────────────────────────────────────────

export type Lang = 'en' | 'tl'
