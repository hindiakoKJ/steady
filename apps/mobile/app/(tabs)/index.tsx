import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Pressable, Alert, Animated, Easing,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { STEADY } from '@repo/ui'
import { fetchCurrentWeather, getCurrentLocation } from '@/hooks/useWeather'
import { useAccelerometer } from '@/hooks/useAccelerometer'
import { seizureLogsApi, contactsApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'
import type { Patient, EmergencyContact } from '@repo/types'
import * as ExpoSms from 'expo-sms'
import { SMS_BEACON_KEY } from '@/app/(tabs)/settings'

// ─── SMS Preview State ────────────────────────────────────────────────────────
interface SmsPreview {
  contacts: EmergencyContact[]
  message: string
  lat: number | undefined
  lon: number | undefined
  activeLogId: string | null
}

export default function EmergencyHub() {
  const router = useRouter()
  const [auraLoading, setAuraLoading] = useState(false)
  const [beaconLoading, setBeaconLoading] = useState(false)
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null)

  // SMS countdown modal state
  const [smsPreview, setSmsPreview] = useState<SmsPreview | null>(null)
  const [countdown, setCountdown] = useState(2)
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

  useEffect(() => {
    const load = async () => {
      const stored = await authStorage.getCurrentPatient()
      if (stored) {
        setCurrentPatient({ id: stored.id, nickname: stored.nickname, householdId: '', createdAt: '' })
      }
    }
    load()
  }, [])

  // ─── Actual fire (called after countdown) ──────────────────────────────────
  const fireSmsAndBeacon = useCallback(async (preview: SmsPreview) => {
    try {
      // Fire server beacon — push notifications to all app users
      if (preview.activeLogId) {
        await seizureLogsApi.fireBeacon(preview.activeLogId, preview.lat, preview.lon)
      }

      const phoneContacts = preview.contacts.filter((c) => c.phoneNumber)
      const pushContacts  = preview.contacts.filter((c) => c.pushToken)

      // SMS — open pre-filled composer if user has SMS enabled and there are phone contacts
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
    } catch (e) {
      Alert.alert('BEACON Error', (e as any)?.response?.data?.message || (e as any)?.message || 'Could not send BEACON')
    } finally {
      setBeaconLoading(false)
    }
  }, [])

  // ─── Countdown Logic ────────────────────────────────────────────────────────
  const startCountdown = useCallback((preview: SmsPreview) => {
    cancelledRef.current = false
    setCountdown(2)
    setSmsPreview(preview)

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          if (!cancelledRef.current) {
            fireSmsAndBeacon(preview)
          }
          setSmsPreview(null)
          return 2
        }
        return prev - 1
      })
    }, 1000)
  }, [fireSmsAndBeacon])

  const cancelCountdown = useCallback(() => {
    cancelledRef.current = true
    if (countdownRef.current) clearInterval(countdownRef.current)
    setSmsPreview(null)
    setCountdown(2)
    setBeaconLoading(false)
  }, [])

  const onPassiveSeizureDetected = useCallback(() => {
    Alert.alert(
      '⚠️ Movement Detected',
      'Rhythmic shaking detected. Is this a seizure?',
      [
        { text: 'No, dismiss', style: 'cancel', onPress: () => accel.resetAlert() },
        { text: 'Yes — LOG IT', onPress: () => handleAura() },
      ]
    )
  }, [])

  const accel = useAccelerometer(onPassiveSeizureDetected)

  const handleAura = useCallback(async () => {
    if (!currentPatient?.id) {
      Alert.alert('No Patient', 'Please select a patient first.')
      return
    }
    setAuraLoading(true)
    try {
      const weather = await fetchCurrentWeather()
      const log = await seizureLogsApi.start({
        patientId: currentPatient.id,
        startedAt: new Date().toISOString(),
        triggeredBy: 'AURA',
        weatherTempC: weather?.tempC,
        weatherCondition: weather?.condition,
        weatherHumidity: weather?.humidity,
        latitude: weather?.lat,
        longitude: weather?.lon,
      })
      await AsyncStorage.setItem('@steady/activeSeizureLogId', log.id)
      router.push('/seizure-active')
    } catch (e) {
      Alert.alert('AURA Error', (e as any)?.response?.data?.message || (e as any)?.message || 'Could not log seizure')
    } finally {
      setAuraLoading(false)
    }
  }, [currentPatient, router])

  const handleBeacon = useCallback(async () => {
    setBeaconLoading(true)
    try {
      const contacts = await contactsApi.list()
      if (contacts.length === 0) {
        Alert.alert('No Contacts', 'Add emergency contacts in Settings first.')
        setBeaconLoading(false)
        return
      }

      // Get GPS directly — don't depend on weather for location
      const [location, existingId] = await Promise.all([
        getCurrentLocation(),
        AsyncStorage.getItem('@steady/activeSeizureLogId'),
      ])

      // BEACON always creates a seizure log if one isn't already running
      let activeId = existingId
      if (!activeId && currentPatient?.id) {
        const log = await seizureLogsApi.start({
          patientId: currentPatient.id,
          startedAt: new Date().toISOString(),
          triggeredBy: 'BEACON',
          latitude: location?.lat,
          longitude: location?.lon,
        })
        activeId = log.id
        await AsyncStorage.setItem('@steady/activeSeizureLogId', log.id)
      }

      const locationText = location
        ? ` Location: https://maps.google.com/?q=${location.lat},${location.lon}`
        : ''
      const nickname = currentPatient?.nickname ?? 'Your contact'
      const message = `STEADY ALERT: ${nickname} may be having a seizure.${locationText}`

      // Show 2-second preview then auto-send
      startCountdown({
        contacts,
        message,
        lat: location?.lat,
        lon: location?.lon,
        activeLogId: activeId,
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
        <View style={[s.statusDot, accel.isMonitoring && s.statusDotActive]} />
        <Text style={s.statusText}>
          {accel.isMonitoring ? 'Passive monitor active' : 'Passive monitor off'}
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
        >
          <Text style={s.actionCardEyebrow}>ALERT</Text>
          <Text style={s.actionCardTitle}>{beaconLoading ? 'Preparing…' : 'BEACON'}</Text>
          <Text style={s.actionCardSub}>Auto-sends SMS + push</Text>
        </Pressable>

        {/* Passive monitor toggle */}
        <Pressable
          style={[s.actionCard, accel.isMonitoring && s.actionCardMonitorActive]}
          onPress={accel.isMonitoring ? accel.stopMonitoring : accel.startMonitoring}
        >
          <Text style={s.actionCardEyebrow}>AUTO-DETECT</Text>
          <Text style={s.actionCardTitle}>{accel.isMonitoring ? 'Monitor ON' : 'Monitor OFF'}</Text>
          <Text style={s.actionCardSub}>Accelerometer watch</Text>
        </Pressable>
      </View>

      {/* Bystander mode */}
      <Pressable style={s.bystanderBtn} onPress={() => router.push('/bystander')}>
        <Text style={s.bystanderLabel}>👥 Bystander Mode</Text>
        <Text style={s.bystanderSub}>First-aid guide — no sign-in needed</Text>
      </Pressable>
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
  iconBtn:              { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
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
  bystanderBtn:         {
    marginHorizontal: 20, marginBottom: 8,
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: STEADY.r.lg, borderWidth: 1, borderColor: STEADY.border.dark,
    alignItems: 'center', gap: 4,
  },
  bystanderLabel:       { fontSize: 14, fontWeight: '600', color: STEADY.ink.onDarkSec },
  bystanderSub:         { fontSize: 11, color: STEADY.ink.onDarkTer },

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
