import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Pressable, Alert, Animated, Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as SMS from 'expo-sms'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MapPin, Clock, Phone, Settings } from 'lucide-react-native'
import { STEADY } from '@repo/ui'
import { fetchCurrentWeather } from '@/hooks/useWeather'
import { useAccelerometer } from '@/hooks/useAccelerometer'
import { seizureLogsApi, contactsApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'
import type { Patient } from '@repo/types'

export default function EmergencyHub() {
  const router = useRouter()
  const [auraLoading, setAuraLoading] = useState(false)
  const [beaconLoading, setBeaconLoading] = useState(false)
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null)

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
        weatherTempC: weather?.tempC,
        weatherCondition: weather?.condition,
        weatherHumidity: weather?.humidity,
        latitude: weather?.lat,
        longitude: weather?.lon,
      })
      await AsyncStorage.setItem('@steady/activeSeizureLogId', log.id)
      router.push('/seizure-active')
    } catch {
      Alert.alert('Error', 'Could not log seizure. Please try again.')
    } finally {
      setAuraLoading(false)
    }
  }, [currentPatient, router])

  const handleBeacon = useCallback(async () => {
    setBeaconLoading(true)
    try {
      const weather = await fetchCurrentWeather()
      const activeId = await AsyncStorage.getItem('@steady/activeSeizureLogId')
      if (activeId) {
        await seizureLogsApi.fireBeacon(activeId, weather?.lat, weather?.lon)
      }

      const contacts = await contactsApi.list()
      const smsContacts = contacts.filter((c) => c.phoneNumber)

      if (contacts.length === 0) {
        Alert.alert('No Contacts', 'Add emergency contacts in Settings to use BEACON.')
        return
      }

      const mapsLink =
        weather?.lat && weather?.lon
          ? `https://maps.google.com/?q=${weather.lat},${weather.lon}`
          : null
      const patientName = currentPatient?.nickname ?? 'your loved one'

      if (smsContacts.length > 0) {
        const smsAvailable = await SMS.isAvailableAsync()
        if (smsAvailable) {
          const message = mapsLink
            ? `🚨 STEADY ALERT: ${patientName} may be having a seizure.\n\nLocation: ${mapsLink}\n\nPlease respond immediately.`
            : `🚨 STEADY ALERT: ${patientName} may be having a seizure. Please respond immediately.`
          await SMS.sendSMSAsync(smsContacts.map((c) => c.phoneNumber!), message)
        }
      }

      const smsCount = smsContacts.length
      const pushCount = contacts.filter((c) => c.pushToken).length
      const parts: string[] = []
      if (smsCount > 0) parts.push(`SMS sent to ${smsCount} contact${smsCount > 1 ? 's' : ''}`)
      if (pushCount > 0) parts.push(`push to ${pushCount} app user${pushCount > 1 ? 's' : ''}`)
      Alert.alert('📡 BEACON Fired', parts.length > 0 ? parts.join(' · ') : `Alerted ${contacts.length} contact${contacts.length > 1 ? 's' : ''}.`)
    } catch {
      Alert.alert('Error', 'Could not send BEACON. Please try again.')
    } finally {
      setBeaconLoading(false)
    }
  }, [currentPatient])

  const initials = currentPatient?.nickname?.[0]?.toUpperCase() ?? '?'

  return (
    <SafeAreaView style={s.root}>
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
          <Settings size={18} color={STEADY.ink.onDarkSec} />
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
              <MapPin size={14} color="rgba(255,255,255,0.75)" />
              <Clock size={14} color="rgba(255,255,255,0.75)" />
              <Phone size={14} color="rgba(255,255,255,0.75)" />
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
          <Text style={s.actionCardTitle}>{beaconLoading ? 'Sending…' : 'BEACON'}</Text>
          <Text style={s.actionCardSub}>SMS your contacts now</Text>
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
})
