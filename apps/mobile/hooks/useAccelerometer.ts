import { useEffect, useRef, useState } from 'react'
import { Accelerometer } from 'expo-sensors'
import { Vibration } from 'react-native'

interface AccelerometerState {
  isMonitoring: boolean
  alertTriggered: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
  resetAlert: () => void
}

// Detects rhythmic shaking in the 3–8 Hz range, which is characteristic of
// tonic-clonic (grand mal) seizures. This is a supplementary tool, not a
// medical diagnostic device.
export function useAccelerometer(onSeizureDetected: () => void): AccelerometerState {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [alertTriggered, setAlertTriggered] = useState(false)

  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null)
  const peaksRef = useRef<number[]>([])
  const lastMagnitudeRef = useRef<number>(0)
  const sustainedCountRef = useRef<number>(0)
  const alertFiredRef = useRef<boolean>(false)

  const startMonitoring = () => {
    if (isMonitoring) return
    alertFiredRef.current = false
    peaksRef.current = []
    sustainedCountRef.current = 0
    setIsMonitoring(true)

    // 20 Hz sample rate — sufficient to detect 3–8 Hz peaks
    Accelerometer.setUpdateInterval(50)

    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z)
      const prev = lastMagnitudeRef.current

      // Detect a peak: magnitude crosses above 1.5g from below
      if (prev < 1.5 && magnitude >= 1.5) {
        const now = Date.now()
        peaksRef.current.push(now)

        // Keep only peaks from the last 2 seconds
        peaksRef.current = peaksRef.current.filter((t) => now - t < 2000)

        // Count peaks per second (peaks in last 1 second)
        const recentPeaks = peaksRef.current.filter((t) => now - t < 1000)
        const hz = recentPeaks.length

        if (hz >= 3 && hz <= 8) {
          sustainedCountRef.current += 1
        } else {
          sustainedCountRef.current = 0
        }

        // 3–8 Hz sustained for ~10 seconds (20 positive ticks)
        if (sustainedCountRef.current >= 20 && !alertFiredRef.current) {
          alertFiredRef.current = true
          setAlertTriggered(true)
          Vibration.vibrate([0, 500, 200, 500, 200, 500])
          onSeizureDetected()
        }
      }

      lastMagnitudeRef.current = magnitude
    })
  }

  const stopMonitoring = () => {
    subscriptionRef.current?.remove()
    subscriptionRef.current = null
    setIsMonitoring(false)
    peaksRef.current = []
    sustainedCountRef.current = 0
  }

  const resetAlert = () => {
    alertFiredRef.current = false
    setAlertTriggered(false)
  }

  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove()
    }
  }, [])

  return { isMonitoring, alertTriggered, startMonitoring, stopMonitoring, resetAlert }
}
