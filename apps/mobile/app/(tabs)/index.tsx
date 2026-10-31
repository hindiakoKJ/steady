import { useState, useCallback, useEffect, useRef } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  View, Text, StyleSheet, Pressable, Alert, Animated, Easing,
  Modal, Platform, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { STEADY } from '@repo/ui'
import { fetchCurrentWeatherWithReason, getCurrentLocation } from '@/hooks/useWeather'
import { useAccelerometer } from '@/hooks/useAccelerometer'
import { backgroundMonitor } from '@/lib/backgroundMonitor'
import { seizureLogsApi, contactsApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'

import type { Patient, EmergencyContact } from '@repo/types'
import * as ExpoSms from 'expo-sms'
import { SMS_BEACON_KEY } from '@/app/(tabs)/settings'

const MONITOR_DISCLAIMER_KEY = '@steady/monitorDisclaimerSeen'
const BATTERY_TIP_KEY = '@steady/batteryTipSeen'

// ─── SMS Preview State ────────────────────────────────────────────────────────
interface SmsPreview {
  contacts: EmergencyContact[]
  message: string
  lat: number | undefined
  lon: number | undefined
  activeLogId: string | null
  startedAt?: string   // set when BEACON creates a new log (not an existing seizure)
  isNewLog?: boolean   // when true, navigate to seizure-active after firing
}

export default function EmergencyHub() {
  const router = useRouter()
  const [auraLoading, setAuraLoading] = useState(false)
  const [beaconLoading, setBeaconLoading] = useState(false)
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null)

  // SMS countdown modal state
  const [smsPreview, setSmsPreview] = useState<SmsPreview | null>(null)
  const [countdown, setCountdown] = useState(5)

  // Passive monitor disclaimer modal
  const [monitorDisclaimerVisible, setMonitorDisclaimerVisible] = useState(false)

  // Android: monitoring runs in a foreground service (works with screen off);
  // iOS keeps the in-app expo-sensors hook.
  const [bgMonitoring, setBgMonitoring] = useState(false)
  // Guards the toggle while an async start/stop is in flight — a double-tap
  // could otherwise enqueue overlapping service starts
  const [monitorBusy, setMonitorBusy] = useState(false)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)

  // Animated halo pulse
  const haloScale = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(haloScale, {
          toValue: 1.08,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(haloScale, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start()
  }, [haloScale])

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const stored = await authStorage.getCurrentPatient()
        if (stored) {
          setCurrentPatient({ id: stored.id, nickname: stored.nickname, householdId: '', createdAt: '' })
        }
      }
      load()
      // Reflect the true service state (user may have stopped it from the
      // notification drawer's task manager while the app was backgrounded)
      if (Platform.OS === 'android') {
        setBgMonitoring(backgroundMonitor.isRunning())
      }
    }, [])
  )

  // Re-arm on launch if the user left monitoring on — covers app relaunch
  // after swipe-away, reboot, or task-manager Stop (foreground start is legal)
  useEffect(() => {
    if (Platform.OS !== 'android') return
    backgroundMonitor
      .rearmIfEnabled()
      .then((running) => setBgMonitoring(running))
      .catch(() => {})
  }, [])

  // ─── Actual fire (called after countdown) ──────────────────────────────────
  const fireSmsAndBeacon = useCallback(async (preview: SmsPreview) => {
    try {
      // Fire server beacon — push notifications to all app users
      if (preview.activeLogId) {
        try {
          await seizureLogsApi.fireBeacon(preview.activeLogId, preview.lat, preview.lon)
        } catch (beaconErr: any) {
          const status = beaconErr?.response?.status
          if (status === 404 || status === 403) {
            // Stale log ID from a previous session/build — clear it and fall through to SMS
            await AsyncStorage.multiRemove(['@steady/activeSeizureLogId', '@steady/activeSeizureStartedAt'])
          } else {
            throw beaconErr  // real server error — surface to user
          }
        }
      }

      const phoneContacts = preview.contacts.filter((c) => c.phoneNumber)
      const pushContacts  = preview.contacts.filter((c) => c.pushToken)

      // SMS — open pre-filled composer (Android requires manual send tap)
      const smsStored = await AsyncStorage.getItem(SMS_BEACON_KEY)
      const smsOn = smsStored === null ? true : smsStored === 'true'
      const smsAvailable = await ExpoSms.isAvailableAsync()

      if (smsOn && smsAvailable && phoneContacts.length > 0) {
        const numbers = phoneContacts.map((c) => c.phoneNumber!)
        await ExpoSms.sendSMSAsync(numbers, preview.message)
      }

      const parts: string[] = []
      if (pushContacts.length > 0)  parts.push(`push → ${pushContacts.length} app user${pushContacts.length > 1 ? 's' : ''}`)
      if (smsOn && phoneContacts.length > 0) parts.push(`SMS → ${phoneContacts.length} contact${phoneContacts.length > 1 ? 's' : ''}`)
      Alert.alert(
        '📡 BEACON Fired',
        parts.length > 0
          ? parts.join(' · ')
          : `Alerting ${preview.contacts.length} contact${preview.contacts.length > 1 ? 's' : ''}…`,
      )

      // If BEACON created a NEW log (no seizure was active), go to seizure-active
      // so the caregiver can track duration and end it properly
      if (preview.isNewLog && preview.startedAt) {
        router.push({ pathname: '/seizure-active', params: { startedAt: preview.startedAt } })
      }
    } catch (e) {
      Alert.alert('BEACON Error', (e as any)?.response?.data?.message || (e as any)?.message || 'Could not send BEACON')
    } finally {
      setBeaconLoading(false)
    }
  }, [router])

  // ─── Countdown Logic ────────────────────────────────────────────────────────
  const startCountdown = useCallback((preview: SmsPreview) => {
    cancelledRef.current = false
    setCountdown(5)
    setSmsPreview(preview)

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          if (!cancelledRef.current) {
            fireSmsAndBeacon(preview)
          }
          setSmsPreview(null)
          return 5
        }
        return prev - 1
      })
    }, 1000)
  }, [fireSmsAndBeacon])

  const cancelCountdown = useCallback(() => {
    cancelledRef.current = true
    if (countdownRef.current) clearInterval(countdownRef.current)
    setSmsPreview(null)
    setCountdown(5)
    setBeaconLoading(false)
  }, [])

  // Ref keeps the latest handleAura visible to the []-dep callback below —
  // without it the first-render closure (currentPatient: null) would be called
  const handleAuraRef = useRef<() => void>(() => {})

  const onPassiveSeizureDetected = useCallback(() => {
    Alert.alert(
      '⚠️ Movement Detected',
      'Rhythmic shaking detected. Is this a seizure?',
      [
        // Cooldowns mirror the background service: 60s after a false alarm,
        // 5min after a confirmed one — then the detector re-arms on its own
        { text: 'No, dismiss', style: 'cancel', onPress: () => accel.rearmAfter(60_000) },
        {
          text: 'Yes — LOG IT',
          onPress: () => {
            handleAuraRef.current()
            accel.rearmAfter(5 * 60_000)
          },
        },
      ]
    )
  }, [])

  const accel = useAccelerometer(onPassiveSeizureDetected)
  const monitorActive = Platform.OS === 'android' ? bgMonitoring : accel.isMonitoring

  // Start monitoring — Android arms the foreground service, iOS the in-app hook
  const startMonitor = useCallback(async () => {
    if (Platform.OS === 'android') {
      setMonitorBusy(true)
      try {
        await backgroundMonitor.start()
        setBgMonitoring(true)
        // One-time battery guidance — OEM battery managers (Xiaomi/Huawei/Oppo)
        // kill background services overnight unless the user exempts the app
        const tipSeen = await AsyncStorage.getItem(BATTERY_TIP_KEY)
        if (tipSeen !== 'true') {
          await AsyncStorage.setItem(BATTERY_TIP_KEY, 'true')
          Alert.alert(
            'Monitoring runs with screen off',
            'Steady now watches for seizure-like movement even when the phone is locked.\n\nFor overnight reliability, set Steady\'s battery usage to "Unrestricted":\nSettings → Apps → Steady → Battery.\n\nXiaomi, Huawei, and Oppo phones may stop monitoring during sleep without this.',
            [
              { text: 'Open App Settings', onPress: () => Linking.openSettings() },
              { text: 'Later', style: 'cancel' },
            ],
          )
        }
      } catch {
        Alert.alert('Monitor Error', 'Could not start background monitoring. Please try again.')
      } finally {
        setMonitorBusy(false)
      }
    } else {
      accel.startMonitoring()
    }
  }, [accel])

  // Show one-time disclaimer before starting passive monitor for the first time
  const handleMonitorToggle = useCallback(async () => {
    if (monitorBusy) return
    if (monitorActive) {
      if (Platform.OS === 'android') {
        setMonitorBusy(true)
        try {
          await backgroundMonitor.stop()
          setBgMonitoring(false)
        } finally {
          setMonitorBusy(false)
        }
      } else {
        accel.stopMonitoring()
      }
      return
    }
    const seen = await AsyncStorage.getItem(MONITOR_DISCLAIMER_KEY)
    if (seen === 'true') {
      startMonitor()
    } else {
      setMonitorDisclaimerVisible(true)
    }
  }, [monitorActive, monitorBusy, accel, startMonitor])

  const handleAura = useCallback(async () => {
    if (!currentPatient?.id) {
      Alert.alert('No Patient', 'Please select a patient first.')
      return
    }
    // Capture the exact moment the button was pressed — timer will count from here
    const startedAt = new Date().toISOString()
    setAuraLoading(true)
    try {
      // Create log immediately — no weather yet so there is zero delay
      const log = await seizureLogsApi.start({
        patientId: currentPatient.id,
        startedAt,
        triggeredBy: 'AURA',
      })
      await AsyncStorage.multiSet([
        ['@steady/activeSeizureLogId', log.id],
        ['@steady/activeSeizureStartedAt', startedAt],
      ])
      // Navigate immediately — timer starts from startedAt
      router.push({ pathname: '/seizure-active', params: { startedAt } })
      // Fetch weather in background — write result (including failure reason) so
      // seizure-active can show a status badge and we can attach it on log end
      fetchCurrentWeatherWithReason()
        .then((result) => {
          AsyncStorage.setItem('@steady/pendingWeather', JSON.stringify(result))
        })
        .catch(() => {/* network totally unavailable — seizure-active will time out and show error */})
    } catch (e) {
      Alert.alert('AURA Error', (e as any)?.response?.data?.message || (e as any)?.message || 'Could not log seizure')
    } finally {
      setAuraLoading(false)
    }
  }, [currentPatient, router])

  // Keep the passive-detection callback pointing at the latest handleAura
  useEffect(() => { handleAuraRef.current = handleAura }, [handleAura])

  const handleBeacon = useCallback(async () => {
    setBeaconLoading(true)
    try {
      const contacts = await contactsApi.list()
      if (contacts.length === 0) {
        Alert.alert('No Contacts', 'Add emergency contacts in Settings first.')
        setBeaconLoading(false)
        return
      }

      // Fetch weather + GPS together. Fall back to GPS-only if offline.
      const [weatherResult, existingId] = await Promise.all([
        fetchCurrentWeatherWithReason(),
        AsyncStorage.getItem('@steady/activeSeizureLogId'),
      ])
      const weather = weatherResult.data
      const location = weather ? { lat: weather.lat, lon: weather.lon } : await getCurrentLocation()

      // BEACON always creates a seizure log if one isn't already running
      let activeId = existingId
      let beaconStartedAt: string | undefined
      let isNewLog = false
      if (!activeId && currentPatient?.id) {
        beaconStartedAt = new Date().toISOString()
        const log = await seizureLogsApi.start({
          patientId: currentPatient.id,
          startedAt: beaconStartedAt,
          triggeredBy: 'BEACON',
          latitude: location?.lat,
          longitude: location?.lon,
          weatherTempC: weather?.tempC,
          weatherCondition: weather?.condition,
          weatherHumidity: weather?.humidity,
        })
        activeId = log.id
        isNewLog = true
        await AsyncStorage.multiSet([
          ['@steady/activeSeizureLogId', log.id],
          ['@steady/activeSeizureStartedAt', beaconStartedAt],
        ])
      }

      // No URL in SMS — Philippine carriers (Globe/Smart) silently block
      // messages containing links. Location is sent via push notification instead.
      const nickname = currentPatient?.nickname ?? 'Your contact'
      const message = `STEADY: ${nickname} may be having a seizure. Please call or go to them now.`

      // Show countdown then open SMS composer; navigate to seizure-active if new log
      startCountdown({
        contacts,
        message,
        lat: location?.lat,
        lon: location?.lon,
        activeLogId: activeId,
        startedAt: beaconStartedAt,
        isNewLog,
      })
    } catch (e) {
      Alert.alert('BEACON Prep Error', (e as any)?.response?.data?.message || (e as any)?.message || 'Could not prepare BEACON')
      setBeaconLoading(false)
    }
  }, [currentPatient, startCountdown])

  const initials = currentPatient?.nickname?.[0]?.toUpperCase() ?? '?'
  const phoneContacts = smsPreview?.contacts.filter((c) => c.phoneNumber) ?? []
  const otherContacts = smsPreview?.contacts.filter((c) => !c.phoneNumber) ?? []

  return (
    <SafeAreaView style={s.root}>
      {/* ── Passive Monitor Disclaimer Modal ── */}
      <Modal
        visible={monitorDisclaimerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonitorDisclaimerVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalEyebrow}>PASSIVE MONITOR</Text>
            <Text style={{ fontSize: 32, marginVertical: 4 }}>⚠️</Text>
            <Text style={[s.modalMsgLabel, { textAlign: 'center', marginBottom: 10 }]}>
              NOT A MEDICAL DEVICE
            </Text>
            <Text style={[s.modalMsgText, { textAlign: 'center', lineHeight: 22 }]}>
              The accelerometer detects rhythmic shaking as a reminder only. It cannot diagnose seizures and may miss episodes or trigger false alerts.{'\n\n'}For the phone to feel a seizure, keep it ON the patient (pocket or waistband) or lying directly on the mattress beside them. A nightstand or table is too far.{'\n\n'}Always follow the advice of your neurologist.
            </Text>
            <Pressable
              style={[s.modalCancelBtn, { backgroundColor: STEADY.accent.softDark, borderColor: STEADY.accent.deep, marginTop: 12 }]}
              accessibilityLabel="I understand, turn on passive monitor"
              accessibilityRole="button"
              onPress={async () => {
                await AsyncStorage.setItem(MONITOR_DISCLAIMER_KEY, 'true')
                setMonitorDisclaimerVisible(false)
                startMonitor()
              }}
            >
              <Text style={[s.modalCancelText, { color: STEADY.accent.base }]}>I understand — turn on</Text>
            </Pressable>
            <Pressable
              onPress={() => setMonitorDisclaimerVisible(false)}
              style={{ paddingVertical: 12 }}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 13, color: STEADY.ink.onDarkSec }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── SMS Countdown Modal ── */}
      <Modal
        visible={smsPreview != null}
        transparent
        animationType="fade"
        onRequestClose={cancelCountdown}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalEyebrow}>BEACON SENDING IN</Text>
            <Text style={s.modalCountdown}>{countdown}</Text>

            {/* Message preview */}
            <View style={s.modalMsgBox}>
              <Text style={s.modalMsgLabel}>MESSAGE</Text>
              <Text style={s.modalMsgText}>{smsPreview?.message}</Text>
            </View>

            {/* Recipients */}
            <View style={s.modalRecipients}>
              {phoneContacts.map((c) => (
                <View key={c.id} style={s.modalRecipRow}>
                  <Ionicons name="chatbubble-outline" size={13} color={STEADY.emergency.base} />
                  <Text style={s.modalRecipName}>{c.nickname}</Text>
                  <Text style={s.modalRecipDetail}>{c.phoneNumber}</Text>
                </View>
              ))}
              {otherContacts.map((c) => (
                <View key={c.id} style={s.modalRecipRow}>
                  <Ionicons name="notifications-outline" size={13} color={STEADY.accent.base} />
                  <Text style={s.modalRecipName}>{c.nickname}</Text>
                  <Text style={s.modalRecipDetail}>push only</Text>
                </View>
              ))}
            </View>

            <Pressable style={s.modalCancelBtn} onPress={cancelCountdown}>
              <Text style={s.modalCancelText}>✕ Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={s.headerText}>
          {currentPatient
            ? <>
                <Text style={s.greeting}>Monitoring</Text>
                <Pressable onPress={() => router.push('/patient-select')}>
                  <Text style={s.greetingName}>{currentPatient.nickname} ↗</Text>
                </Pressable>
              </>
            : <Text style={s.greetingName}>Select a patient</Text>
          }
        </View>
        <Pressable style={s.iconBtn} onPress={() => router.push('/(tabs)/settings')}>
          <Ionicons name="settings-outline" size={18} color={STEADY.ink.onDarkSec} />
        </Pressable>
      </View>

      {/* Status strip */}
      <View style={s.statusPill}>
        <View style={[s.statusDot, monitorActive && s.statusDotActive]} />
        <Text style={s.statusText}>
          {monitorActive
            ? Platform.OS === 'android'
              ? 'Passive monitor active — screen can be off'
              : 'Passive monitor active'
            : 'Passive monitor off'}
        </Text>
      </View>

      {/* Hero area */}
      <View style={s.heroArea}>
        <View style={s.heroButtonWrap}>
          {/* Outer halo */}
          <Animated.View
            style={[s.haloOuter, { transform: [{ scale: haloScale }] }]}
            pointerEvents="none"
          />
          {/* Inner halo */}
          <Animated.View
            style={[s.haloInner, { transform: [{ scale: haloScale }] }]}
            pointerEvents="none"
          />
          {/* Main button */}
          <Pressable
            style={[s.heroButton, auraLoading && s.heroButtonLoading]}
            onPress={handleAura}
            disabled={auraLoading}
            accessibilityLabel="Start seizure log"
            accessibilityHint="Logs GPS, weather, and start time automatically"
            accessibilityRole="button"
          >
            <Text style={s.heroEyebrow}>I FEEL ONE COMING</Text>
            <Text style={s.heroLabel}>{auraLoading ? 'Logging…' : 'Hold to start'}</Text>
            <View style={s.heroAffordances}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.75)" />
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.75)" />
              <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.75)" />
            </View>
          </Pressable>
        </View>
        <Text style={s.heroCaption}>
          Tap to log a seizure. Saves GPS, weather, and start time automatically.
        </Text>
      </View>

      {/* Secondary actions */}
      <View style={s.actionsRow}>
        {/* BEACON */}
        <Pressable
          style={[s.actionCard, s.actionCardBeacon, beaconLoading && s.actionCardDisabled]}
          onPress={handleBeacon}
          disabled={beaconLoading}
          accessibilityLabel="Send BEACON alert"
          accessibilityHint="Sends SMS and push notifications to all emergency contacts"
          accessibilityRole="button"
        >
          <Text style={s.actionCardEyebrow}>ALERT</Text>
          <Text style={s.actionCardTitle}>{beaconLoading ? 'Preparing…' : 'BEACON'}</Text>
          <Text style={s.actionCardSub}>Auto-sends SMS + push</Text>
        </Pressable>

        {/* Passive monitor toggle */}
        <Pressable
          style={[s.actionCard, monitorActive && s.actionCardMonitorActive, monitorBusy && s.actionCardDisabled]}
          onPress={handleMonitorToggle}
          disabled={monitorBusy}
          accessibilityLabel={monitorActive ? 'Turn off passive monitor' : 'Turn on passive monitor'}
          accessibilityHint="Uses accelerometer to detect rhythmic shaking"
          accessibilityRole="button"
        >
          <Text style={s.actionCardEyebrow}>AUTO-DETECT</Text>
          <Text style={s.actionCardTitle}>{monitorActive ? 'Monitor ON' : 'Monitor OFF'}</Text>
          <Text style={s.actionCardSub}>
            {Platform.OS === 'android' ? 'Works with screen off' : 'Accelerometer watch'}
          </Text>
        </Pressable>
      </View>

      {/* Bottom quick-access row */}
      <View style={s.quickRow}>
        <Pressable
          style={[s.quickBtn, { flex: 1 }]}
          onPress={() => router.push('/bystander')}
          accessibilityLabel="Open Bystander Mode"
          accessibilityRole="button"
        >
          <Ionicons name="people-outline" size={16} color={STEADY.ink.onDarkSec} />
          <Text style={s.quickLabel}>Bystander Mode</Text>
        </Pressable>

        <View style={s.quickDivider} />

        <Pressable
          style={[s.quickBtn, { flex: 1 }]}
          onPress={() => router.push('/emergency-id' as any)}
          accessibilityLabel="View Emergency ID Card"
          accessibilityRole="button"
        >
          <Ionicons name="id-card-outline" size={16} color={STEADY.emergency.base} />
          <Text style={[s.quickLabel, { color: STEADY.emergency.base }]}>Emergency ID Card</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:                 { flex: 1, backgroundColor: STEADY.bg.dark },
  headerRow:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8 },
  avatar:               { width: 38, height: 38, borderRadius: 19, backgroundColor: STEADY.accent.softDark, alignItems: 'center', justifyContent: 'center' },
  avatarText:           { color: STEADY.accent.soft, fontSize: 14, fontWeight: '700' },
  headerText:           { flex: 1 },
  greeting:             { fontSize: 12, color: STEADY.ink.onDarkSec },
  greetingName:         { fontSize: 16, fontWeight: '600', color: STEADY.ink.onDark },
  iconBtn:              { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  statusPill:           {
    marginHorizontal: 20, marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: STEADY.r.pill,
    backgroundColor: STEADY.accent.softDark,
    borderWidth: 1, borderColor: STEADY.accent.deep,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  statusDot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: STEADY.ink.onDarkTer },
  statusDotActive:      { backgroundColor: STEADY.accent.base },
  statusText:           { fontSize: 13, color: STEADY.accent.soft, fontWeight: '500' },
  heroArea:             { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  heroButtonWrap:       { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  haloOuter:            {
    position: 'absolute',
    width: 296, height: 296, borderRadius: 148,
    backgroundColor: STEADY.emergency.base, opacity: 0.07,
    top: -28, left: -28,
  },
  haloInner:            {
    position: 'absolute',
    width: 264, height: 264, borderRadius: 132,
    backgroundColor: STEADY.emergency.base, opacity: 0.14,
    top: -12, left: -12,
  },
  heroButton:           {
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: STEADY.emergency.base,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: STEADY.emergency.base,
    shadowOpacity: 0.4, shadowRadius: 50,
    shadowOffset: { width: 0, height: 20 }, elevation: 12,
  },
  heroButtonLoading:    { opacity: 0.75 },
  heroEyebrow:          { fontSize: 10, fontWeight: '700', letterSpacing: 2.4, color: 'rgba(255,255,255,0.8)' },
  heroLabel:            { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, color: '#fff', marginTop: 2 },
  heroAffordances:      { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6, opacity: 0.8 },
  heroCaption:          { fontSize: 13, color: STEADY.ink.onDarkSec, marginTop: 20, textAlign: 'center', maxWidth: 260, lineHeight: 19 },
  actionsRow:           { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  actionCard:           {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14, borderRadius: STEADY.r.lg,
    backgroundColor: STEADY.bg.darkSurface,
    borderWidth: 1, borderColor: STEADY.border.dark,
    gap: 2,
  },
  actionCardBeacon:     { backgroundColor: STEADY.emergency.softDark, borderColor: STEADY.emergency.deep },
  actionCardMonitorActive: { borderColor: '#2563eb', backgroundColor: '#0f1e4a' },
  actionCardDisabled:   { opacity: 0.6 },
  actionCardEyebrow:    { fontSize: 9, fontWeight: '700', letterSpacing: 1.6, color: STEADY.ink.onDarkTer },
  actionCardTitle:      { fontSize: 16, fontWeight: '700', color: STEADY.ink.onDark, marginTop: 2 },
  actionCardSub:        { fontSize: 11, color: STEADY.ink.onDarkSec },
  quickRow:             {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 8,
    borderRadius: STEADY.r.lg, borderWidth: 1, borderColor: STEADY.border.dark,
    overflow: 'hidden',
  },
  quickBtn:             {
    paddingVertical: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  quickLabel:           { fontSize: 13, fontWeight: '600', color: STEADY.ink.onDarkSec },
  quickDivider:         { width: 1, height: 36, backgroundColor: STEADY.border.dark },

  // ── SMS Countdown Modal ──────────────────────────────────────────────────────
  modalOverlay:         {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard:            {
    width: '100%', maxWidth: 360,
    backgroundColor: STEADY.bg.darkSurface,
    borderRadius: STEADY.r.lg,
    borderWidth: 1, borderColor: STEADY.emergency.deep,
    padding: 24, alignItems: 'center', gap: 16,
  },
  modalEyebrow:         { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: STEADY.emergency.base },
  modalCountdown:       { fontSize: 72, fontWeight: '800', color: STEADY.emergency.base, lineHeight: 80 },
  modalMsgBox:          {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: STEADY.r.md, padding: 12, gap: 4,
  },
  modalMsgLabel:        { fontSize: 9, fontWeight: '700', letterSpacing: 1.6, color: STEADY.ink.onDarkTer },
  modalMsgText:         { fontSize: 13, color: STEADY.ink.onDark, lineHeight: 19 },
  modalRecipients:      { width: '100%', gap: 8 },
  modalRecipRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalRecipName:       { fontSize: 13, fontWeight: '600', color: STEADY.ink.onDark, flex: 1 },
  modalRecipDetail:     { fontSize: 11, color: STEADY.ink.onDarkSec },
  modalCancelBtn:       {
    marginTop: 4, paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: STEADY.r.pill,
    borderWidth: 1, borderColor: STEADY.emergency.deep,
    backgroundColor: STEADY.emergency.softDark,
  },
  modalCancelText:      { fontSize: 14, fontWeight: '700', color: STEADY.emergency.base },
})
