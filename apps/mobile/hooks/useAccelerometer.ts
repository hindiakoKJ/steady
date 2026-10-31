import { useEffect, useRef, useState } from 'react'
import { Accelerometer } from 'expo-sensors'
import { Vibration } from 'react-native'
import { SeizureDetector, normalizeSensorTimestamp } from '@/lib/seizureDetector'

interface AccelerometerState {
  isMonitoring: boolean
  alertTriggered: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
  resetAlert: () => void
  /** Re-arm the latched detector after a cooldown (mirrors the background
   *  service's cooldowns) — without this, one confirmed detection would leave
   *  the monitor latched forever while the UI still says it's active. */
  rearmAfter: (ms: number) => void
}

// In-app (foreground) passive monitor. Detection algorithm lives in
// lib/seizureDetector.ts, shared with the Android background service.
// NOTE: expo-sensors stops delivering when the activity pauses, so this hook
// only monitors while the app is open — on Android the background service
// (lib/backgroundMonitor.ts) is the primary path. This is a supplementary
// tool, not a medical diagnostic device.
export function useAccelerometer(onSeizureDetected: () => void): AccelerometerState {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [alertTriggered, setAlertTriggered] = useState(false)

  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null)
  const detectorRef = useRef(new SeizureDetector())
  const rearmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRearmTimer = () => {
    if (rearmTimerRef.current) {
      clearTimeout(rearmTimerRef.current)
      rearmTimerRef.current = null
    }
  }

  const startMonitoring = () => {
    // Guard on the ref, not React state — state is render-captured, so two
    // calls in the same render epoch would both see false and leak a listener
    if (subscriptionRef.current) return
    clearRearmTimer()
    detectorRef.current.reset()
    setIsMonitoring(true)

    // 20 ms = 50 Hz: fast sampling lets the detector's ~14 Hz low-pass remove
    // vehicle vibration instead of letting it alias into the seizure band
    Accelerometer.setUpdateInterval(20)

    subscriptionRef.current = Accelerometer.addListener(({ x, y, z, timestamp }) => {
      // expo-sensors already reports in units of g; hardware timestamps
      // survive JS-thread congestion
      if (detectorRef.current.addSample(x, y, z, normalizeSensorTimestamp(timestamp))) {
        setAlertTriggered(true)
        Vibration.vibrate([0, 500, 200, 500, 200, 500])
        onSeizureDetected()
      }
    })
  }

  const stopMonitoring = () => {
    subscriptionRef.current?.remove()
    subscriptionRef.current = null
    clearRearmTimer()
    setIsMonitoring(false)
    detectorRef.current.reset()
  }

  const resetAlert = () => {
    clearRearmTimer()
    detectorRef.current.reset()
    setAlertTriggered(false)
  }

  const rearmAfter = (ms: number) => {
    clearRearmTimer()
    rearmTimerRef.current = setTimeout(() => {
      rearmTimerRef.current = null
      detectorRef.current.reset()
      setAlertTriggered(false)
    }, ms)
  }

  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove()
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
    }
  }, [])

  return { isMonitoring, alertTriggered, startMonitoring, stopMonitoring, resetAlert, rearmAfter }
}
