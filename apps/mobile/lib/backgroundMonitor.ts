// Android background seizure monitoring via a foreground service.
//
// Why this exists: expo-sensors deliberately unregisters its native listener the
// moment the activity pauses (screen off / app backgrounded), so the in-app hook
// can never monitor overnight. This module runs the same SeizureDetector inside
// a foreground service (react-native-background-actions, FGS type "health") and
// sources samples from react-native-sensors, whose plain SensorEventListener
// keeps delivering in the background while the service holds the process alive.
//
// Detection flow (all headless-safe — no Alert.alert, no navigation):
//   detect → vibrate + cancellable countdown notification (30 s)
//     → cancelled: cool down 60 s, keep monitoring
//     → not cancelled: create PASSIVE seizure log → fire server BEACON push
//       to all contacts → "family alerted" notification → cool down 5 min
//
// SMS cannot be sent from the background (expo-sms opens a composer that needs
// a manual tap) — the server push is the background alert path. The persistent
// FGS notification honestly reflects state and monitoring is user-stoppable,
// per Play foreground-service policy.
//
// Concurrency: start()/stop() are serialized on a single op chain (concurrent
// starts would spawn duplicate headless tasks), and stop() disarms + cancels
// any pending countdown so a BEACON can never fire after Monitor OFF.

import { Platform, Vibration } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'
import BackgroundService from 'react-native-background-actions'
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors'
import type { Subscription } from 'rxjs'
import { SeizureDetector, normalizeSensorTimestamp } from './seizureDetector'
import { seizureLogsApi } from './api'
import { authStorage } from './auth'
import { acquireWakeLock, releaseWakeLock } from '../modules/steady-wakelock'

export const MONITOR_ENABLED_KEY = '@steady/monitorEnabled'
const ACTIVE_LOG_KEY = '@steady/activeSeizureLogId'
const ACTIVE_STARTED_AT_KEY = '@steady/activeSeizureStartedAt'

const CANCEL_CATEGORY = 'steady-seizure-countdown'
const CANCEL_ACTION = 'cancel-beacon'
const COUNTDOWN_NOTIF_ID = 'steady-detection-countdown'

const COUNTDOWN_SECONDS = 30
const CANCEL_COOLDOWN_MS = 60_000        // after a cancelled (false-alarm) detection
const FIRED_COOLDOWN_MS = 5 * 60_000     // after a fired BEACON — refires if still shaking
const G = 9.80665                        // react-native-sensors reports m/s²; detector wants g

const FGS_NOTIFICATION = {
  taskName: 'SteadyMonitor',
  taskTitle: 'Steady — passive monitor active',
  taskDesc: 'Watching for seizure-like movement. Tap to open.',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' as const },
  color: '#5B5BD6',
  linkingURI: 'steady://',
  parameters: {},
  // Must match android:foregroundServiceType set by plugins/withHealthForegroundService.js
  foregroundServiceType: ['health' as const],
}

// Delivery-rate telemetry: warn honestly instead of monitoring blind when the
// device throttles sensor delivery below what rhythm detection needs
const DEGRADED_RATE_HZ = 25
const DEGRADED_AFTER_MS = 30_000

let sensorSub: Subscription | null = null
let stopTask: (() => void) | null = null
let lowRateSince = 0
let rateWarned = false

function maybeWarnDegradedRate(detector: SeizureDetector, wall: number): void {
  const rate = detector.effectiveRateHz
  if (rate === null) return
  if (rate >= DEGRADED_RATE_HZ) {
    lowRateSince = 0
    if (rateWarned) {
      rateWarned = false
      BackgroundService.updateNotification({
        taskTitle: FGS_NOTIFICATION.taskTitle,
        taskDesc: FGS_NOTIFICATION.taskDesc,
      }).catch(() => {})
    }
    return
  }
  if (lowRateSince === 0) {
    lowRateSince = wall
    return
  }
  if (!rateWarned && wall - lowRateSince >= DEGRADED_AFTER_MS) {
    rateWarned = true
    BackgroundService.updateNotification({
      taskTitle: '⚠️ Monitoring degraded',
      taskDesc: 'This phone delivers motion data slowly — detection may be unreliable.',
    }).catch(() => {})
  }
}
// Safety gate: false the instant stop() begins, checked before any BEACON fires
let armed = false
// Handle to abort a countdown that is pending when stop() runs
let currentCountdownCancel: (() => void) | null = null
// start()/stop() are serialized through this chain — see module header
let opChain: Promise<void> = Promise.resolve()

function serialize(fn: () => Promise<void>): Promise<void> {
  const next = opChain.then(fn, fn)
  opChain = next.catch(() => {})
  return next
}

async function ensureBeaconChannel(): Promise<void> {
  // Idempotent — same spec as lib/notifications.ts so whichever runs first wins
  await Notifications.setNotificationChannelAsync('beacon', {
    name: 'BEACON Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C8312B',
    sound: 'default',
  })
}

async function notifyLocal(
  title: string,
  body: string,
  data: Record<string, string> = {},
  options: { identifier?: string; categoryIdentifier?: string; autoDismiss?: boolean } = {},
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    ...(options.identifier ? { identifier: options.identifier } : {}),
    content: {
      title,
      body,
      sound: 'default',
      data,
      ...(options.categoryIdentifier ? { categoryIdentifier: options.categoryIdentifier } : {}),
      ...(options.autoDismiss === false ? { autoDismiss: false } : {}),
    },
    // ChannelAwareTriggerInput: deliver immediately on the MAX-importance channel
    trigger: { channelId: 'beacon' },
  })
}

/**
 * Show the cancellable countdown notification and wait COUNTDOWN_SECONDS.
 * Resolves true if cancelled (user tapped "I'M OK", or stop() aborted it),
 * false to proceed with the BEACON.
 */
function showCountdownAndWait(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const settle = (cancelled: boolean) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      sub.remove()
      currentCountdownCancel = null
      resolve(cancelled)
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (
        response.actionIdentifier === CANCEL_ACTION &&
        response.notification.request.identifier === COUNTDOWN_NOTIF_ID
      ) {
        settle(true)
      }
    })

    // stop() aborts a pending countdown through this handle
    currentCountdownCancel = () => settle(true)

    notifyLocal(
      '⚠️ Possible seizure detected',
      `Steady will alert your family in ${COUNTDOWN_SECONDS} seconds. False alarm? Tap "I'M OK".`,
      { screen: 'home' },
      // autoDismiss:false — a body tap opens the app but the notification (and
      // its cancel action) must stay in the shade for the rest of the countdown
      { identifier: COUNTDOWN_NOTIF_ID, categoryIdentifier: CANCEL_CATEGORY, autoDismiss: false },
    ).catch(() => {
      // If the notification can't be shown (permission denied) we still proceed:
      // a possible seizure with no cancel prompt should err toward alerting.
    })

    timer = setTimeout(() => settle(false), COUNTDOWN_SECONDS * 1000)
  })
}

/** Create/reuse the seizure log and fire the server BEACON push — all headless. */
async function fireBeaconHeadless(): Promise<void> {
  try {
    const patient = await authStorage.getCurrentPatient()

    const createFreshLog = async (): Promise<string> => {
      if (!patient?.id) throw new Error('no-patient-selected')
      const startedAt = new Date().toISOString()
      const log = await seizureLogsApi.start({
        patientId: patient.id,
        startedAt,
        triggeredBy: 'PASSIVE',
      })
      await AsyncStorage.multiSet([
        [ACTIVE_LOG_KEY, log.id],
        [ACTIVE_STARTED_AT_KEY, startedAt],
      ])
      return log.id
    }

    let logId = await AsyncStorage.getItem(ACTIVE_LOG_KEY)
    const fromStorage = !!logId
    if (!logId) logId = await createFreshLog()

    // Best-effort location: with only while-in-use permission Android denies
    // background fixes, but a cached last-known position may still be available.
    let lat: number | undefined
    let lon: number | undefined
    try {
      const pos = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 })
      if (pos) {
        lat = pos.coords.latitude
        lon = pos.coords.longitude
      }
    } catch { /* proceed without location */ }

    try {
      await seizureLogsApi.fireBeacon(logId, lat, lon)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (fromStorage && (status === 404 || status === 403)) {
        // Stale id from an old session/build — replace with a fresh log and
        // retry exactly once (fromStorage guard prevents a retry loop when a
        // freshly created log's beacon 4xxs, which is a genuine server fault)
        await AsyncStorage.multiRemove([ACTIVE_LOG_KEY, ACTIVE_STARTED_AT_KEY])
        logId = await createFreshLog()
        await seizureLogsApi.fireBeacon(logId, lat, lon)
      } else {
        throw err
      }
    }

    await notifyLocal(
      '🚨 BEACON fired — family alerted',
      `${patient?.nickname ?? 'The patient'} may be having a seizure. Push alerts sent to all contacts. Tap to open Steady.`,
      { screen: 'seizure-active' },
    )
    await BackgroundService.updateNotification({
      taskTitle: '🚨 Family alerted',
      taskDesc: 'Monitoring continues. Tap the alert above to open Steady.',
    }).catch(() => {})
  } catch {
    // Server unreachable / not logged in / no patient — the local notification
    // still alerts anyone near the phone. Be honest about what failed.
    await notifyLocal(
      '⚠️ Movement detected — could not send the alert',
      'Steady detected seizure-like movement but could not alert your family. Please check on the patient now.',
      { screen: 'home' },
    )
  }
}

async function handleDetection(setCooldown: (ms: number) => void): Promise<void> {
  Vibration.vibrate([0, 500, 200, 500, 200, 500])

  await BackgroundService.updateNotification({
    taskTitle: '⚠️ Possible seizure detected',
    taskDesc: `Alerting family in ${COUNTDOWN_SECONDS}s unless cancelled from the alert above.`,
  }).catch(() => {})

  const cancelled = await showCountdownAndWait()
  await Notifications.dismissNotificationAsync(COUNTDOWN_NOTIF_ID).catch(() => {})

  if (cancelled) {
    await BackgroundService.updateNotification({
      taskTitle: FGS_NOTIFICATION.taskTitle,
      taskDesc: FGS_NOTIFICATION.taskDesc,
    }).catch(() => {})
    setCooldown(CANCEL_COOLDOWN_MS)
    return
  }

  // stop() may have run while the countdown timer was resolving — a disarmed
  // monitor must never fire a BEACON
  if (!armed) return

  await fireBeaconHeadless()
  setCooldown(FIRED_COOLDOWN_MS)
}

// The long-running task: keeps a pending promise so the service stays up,
// samples the accelerometer at 20 Hz, and feeds the shared detector.
const monitoringTask = async (): Promise<void> => {
  // Idempotent: if a duplicate invocation ever happens (system-restarted
  // service racing a re-arm), tear down the previous run's handles first so
  // no ghost subscription keeps detecting after stop()
  sensorSub?.unsubscribe()
  sensorSub = null
  stopTask?.()
  stopTask = null

  const detector = new SeizureDetector()
  let pausedUntil = 0
  let handling = false

  await new Promise<void>((resolve) => {
    stopTask = resolve
    // 10 ms = 100 Hz: fast sampling so engine/vehicle vibration (20–50 Hz) is
    // RESOLVED and removed by the detector's low-pass filter instead of
    // aliasing into the seizure band. Android may still deliver slower — the
    // detector is rate-invariant and reports effectiveRateHz for telemetry.
    setUpdateIntervalForType(SensorTypes.accelerometer, 10)
    sensorSub = accelerometer.subscribe({
      next: ({ x, y, z, timestamp }) => {
        const wall = Date.now()
        if (handling || wall < pausedUntil) return
        // Hardware timestamps survive bridge congestion/batching; the wall
        // clock only gates cooldowns
        const now = normalizeSensorTimestamp(timestamp)
        // react-native-sensors reports m/s² — normalize to g for the detector
        if (detector.addSample(x / G, y / G, z / G, now)) {
          handling = true
          handleDetection((cooldownMs) => {
            pausedUntil = Date.now() + cooldownMs
            detector.reset()
            handling = false
          }).catch(() => {
            // Never let an alert failure kill the monitoring loop
            pausedUntil = Date.now() + CANCEL_COOLDOWN_MS
            detector.reset()
            handling = false
          })
        } else {
          maybeWarnDegradedRate(detector, wall)
        }
      },
      error: () => { /* sensor unavailable — service keeps running, no samples */ },
    })
  })
}

export const backgroundMonitor = {
  isSupported: Platform.OS === 'android',

  isRunning(): boolean {
    return this.isSupported && BackgroundService.isRunning()
  },

  /**
   * Start the foreground service. MUST be called while the app is in the
   * foreground (Android 12+ restricts background FGS starts; the health type
   * cannot start from the background at all).
   */
  start(): Promise<void> {
    return serialize(async () => {
      if (!this.isSupported || BackgroundService.isRunning()) return

      // FGS runs even if notifications are denied, but every alert would be
      // invisible — ask before we arm.
      await Notifications.requestPermissionsAsync().catch(() => {})
      await ensureBeaconChannel()
      await Notifications.setNotificationCategoryAsync(CANCEL_CATEGORY, [
        {
          identifier: CANCEL_ACTION,
          buttonTitle: "I'M OK — don't alert",
          options: { opensAppToForeground: false },
        },
      ])

      armed = true
      lowRateSince = 0
      rateWarned = false
      await BackgroundService.start(monitoringTask, FGS_NOTIFICATION)
      // The FGS prevents process death but NOT CPU suspend — without a partial
      // wakelock the SoC sleeps once the screen is off and idle, and the
      // (non-wakeup) accelerometer goes silent for exactly the overnight
      // scenario this monitor exists for
      acquireWakeLock()
      await AsyncStorage.setItem(MONITOR_ENABLED_KEY, 'true')
    })
  },

  stop(): Promise<void> {
    return serialize(async () => {
      armed = false
      // Abort any pending countdown so a BEACON can't fire after Monitor OFF,
      // and remove its lingering notification from the shade
      currentCountdownCancel?.()
      currentCountdownCancel = null
      await Notifications.dismissNotificationAsync(COUNTDOWN_NOTIF_ID).catch(() => {})

      await AsyncStorage.setItem(MONITOR_ENABLED_KEY, 'false')
      sensorSub?.unsubscribe()
      sensorSub = null
      stopTask?.()
      stopTask = null
      if (BackgroundService.isRunning()) {
        await BackgroundService.stop()
      }
      releaseWakeLock()
    })
  },

  /**
   * Re-arm on app launch if the user left monitoring on (survives process death
   * from swipe-away, reboot, or task-manager Stop — resumes next time the app
   * opens, which is a legal foreground start).
   */
  async rearmIfEnabled(): Promise<boolean> {
    if (!this.isSupported) return false
    const enabled = (await AsyncStorage.getItem(MONITOR_ENABLED_KEY)) === 'true'
    if (enabled && !BackgroundService.isRunning()) {
      await this.start()
    }
    return enabled && BackgroundService.isRunning()
  },
}
