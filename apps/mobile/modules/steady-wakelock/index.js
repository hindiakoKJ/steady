import { requireNativeModule } from 'expo-modules-core'

// Only available in native Android builds that include this local module —
// not in Expo Go or dev clients built before it existed. Callers must treat
// a false return from acquire() as "no wakelock" and surface degraded
// reliability rather than crash.
let SteadyWakelock = null
try {
  SteadyWakelock = requireNativeModule('SteadyWakelock')
} catch {
  // Expo Go, iOS, or stale native build — module not available
}

export function acquireWakeLock() {
  if (!SteadyWakelock) return false
  try {
    return SteadyWakelock.acquire() === true
  } catch {
    return false
  }
}

export function releaseWakeLock() {
  if (!SteadyWakelock) return
  try {
    SteadyWakelock.release()
  } catch {
    // nothing to release
  }
}

export const isWakeLockAvailable = SteadyWakelock != null
