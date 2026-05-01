import { useEffect, useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STEADY } from '@repo/ui'
import { SettingRow, SettingsGroup } from '@/components/SettingsRow'
import { contactsApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'
import type { EmergencyContact } from '@repo/types'

export const SMS_BEACON_KEY   = '@steady/smsBeaconEnabled'
export const AUTO_ALERT_KEY   = '@steady/autoAlert5min'
export const SHARE_GPS_KEY    = '@steady/shareGpsDuringSeizure'

export default function SettingsScreen() {
  const router = useRouter()
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [currentPatient, setCurrentPatient] = useState<{ id: string; nickname: string } | null>(null)
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [autoAlert, setAutoAlert] = useState(true)
  const [shareGps, setShareGps] = useState(true)

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const patient = await authStorage.getCurrentPatient()
        setCurrentPatient(patient)
        try {
          const list = await contactsApi.list()
          setContacts(list)
        } catch {
          // Not yet connected to API — silently ignore
        }
        const stored = await AsyncStorage.getItem(SMS_BEACON_KEY)
        setSmsEnabled(stored === null ? true : stored === 'true')
        const autoAlertStored = await AsyncStorage.getItem(AUTO_ALERT_KEY)
        setAutoAlert(autoAlertStored === null ? true : autoAlertStored === 'true')
        const shareGpsStored = await AsyncStorage.getItem(SHARE_GPS_KEY)
        setShareGps(shareGpsStored === null ? true : shareGpsStored === 'true')
      }
      load()
    }, [])
  )

  const handleSmsToggle = async (val: boolean) => {
    setSmsEnabled(val)
    await AsyncStorage.setItem(SMS_BEACON_KEY, String(val))
  }

  const handleAutoAlertToggle = async (val: boolean) => {
    setAutoAlert(val)
    await AsyncStorage.setItem(AUTO_ALERT_KEY, String(val))
  }

  const handleShareGpsToggle = async (val: boolean) => {
    setShareGps(val)
    await AsyncStorage.setItem(SHARE_GPS_KEY, String(val))
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authStorage.clearSession()
          router.replace('/auth/login')
        },
      },
    ])
  }

  const initials = currentPatient?.nickname?.[0]?.toUpperCase() ?? '?'
  const contactSub = contacts.length > 0
    ? `${contacts.length} contact${contacts.length > 1 ? 's' : ''} · ${contacts[0]?.nickname ?? ''} is primary`
    : 'No contacts added yet'

  return (
    <SafeAreaView style={s.root}>
      <View style={s.headerRow}>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        {currentPatient && (
          <Pressable style={s.profileCard} onPress={() => router.push('/patient-select')}>
            <View style={s.profileAvatar}>
              <Text style={s.profileAvatarText}>{initials}</Text>
            </View>
            <View style={s.profileText}>
              <Text style={s.profileName}>{currentPatient.nickname}</Text>
              <Text style={s.profileMeta}>Active patient · tap to switch</Text>
            </View>
            <Text style={s.profileChevron}>↗</Text>
          </Pressable>
        )}

        {/* Safety group */}
        <SettingsGroup title="Safety">
          <SettingRow
            icon={<Ionicons name="call-outline" size={16} color={STEADY.emergency.base} />}
            iconColor={STEADY.emergency.base}
            iconBg={STEADY.emergency.soft}
            title="Emergency contacts"
            sub={contactSub}
            onPress={() => router.push('/contacts')}
          />
          <SettingRow
            icon={<Ionicons name="chatbubble-outline" size={16} color={STEADY.warn.base} />}
            iconColor={STEADY.warn.base}
            iconBg={STEADY.warn.soft}
            title="SMS alerts on BEACON"
            sub={smsEnabled
              ? 'Opens pre-filled SMS for contacts with phone numbers'
              : 'Push notifications only (app users)'}
            toggle
            toggleValue={smsEnabled}
            onToggle={handleSmsToggle}
          />
          <SettingRow
            icon={<Ionicons name="shield-checkmark-outline" size={16} color={STEADY.accent.base} />}
            iconColor={STEADY.accent.base}
            iconBg={STEADY.accent.soft}
            title="Bystander mode card"
            sub="Lock-screen medical card for strangers"
            onPress={() => router.push('/bystander')}
          />
          <SettingRow
            icon={<Ionicons name="notifications-outline" size={16} color={STEADY.warn.base} />}
            iconColor={STEADY.warn.base}
            iconBg={STEADY.warn.soft}
            title="Auto-alert at 5 minutes"
            sub={autoAlert ? 'BEACON fires automatically at status epilepticus threshold' : 'Manual BEACON only'}
            toggle
            toggleValue={autoAlert}
            onToggle={handleAutoAlertToggle}
          />
          <SettingRow
            icon={<Ionicons name="location-outline" size={16} color={STEADY.accent.base} />}
            iconColor={STEADY.accent.base}
            iconBg={STEADY.accent.soft}
            title="Share GPS during seizure"
            sub={shareGps ? 'Location included in BEACON alert' : 'Location omitted from alerts'}
            toggle
            toggleValue={shareGps}
            onToggle={handleShareGpsToggle}
            last
          />
        </SettingsGroup>

        {/* Language group */}
        <SettingsGroup title="Language">
          <SettingRow
            icon={<Ionicons name="globe-outline" size={16} color={STEADY.ink.secondary} />}
            iconColor={STEADY.ink.secondary}
            iconBg={STEADY.bg.sunken}
            title="App language"
            sub="English"
            last
            onPress={() => Alert.alert('Language', 'English / Filipino — full bilingual support coming soon.')}
          />
        </SettingsGroup>

        {/* Privacy card */}
        <View style={s.privacyCard}>
          <Text style={s.privacyEyebrow}>Privacy Promise</Text>
          <Text style={s.privacyText}>
            "We don't sell your sickness. We don't track your identity. We only track what helps you stay safe."
          </Text>
          <View style={s.privacyPoints}>
            <Text style={s.privacyPoint}>✓ No full name stored anywhere</Text>
            <Text style={s.privacyPoint}>✓ No phone number required</Text>
            <Text style={s.privacyPoint}>✓ 100% free. Always.</Text>
          </View>
        </View>

        {/* Sign out */}
        <Pressable style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Sign Out</Text>
        </Pressable>

        <View style={s.footer}>
          <Text style={s.footerApp}>Steady</Text>
          <Text style={s.footerSub}>Free for everyone. Always.</Text>
          <Text style={s.footerSub}>Built by a dad, for every family.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: STEADY.bg.light },
  headerRow:          { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  title:              { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: STEADY.ink.primary },
  scrollContent:      { paddingHorizontal: 16, paddingBottom: 40 },
  profileCard:        { backgroundColor: '#fff', borderRadius: STEADY.r.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: STEADY.border.light, marginBottom: 18 },
  profileAvatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: STEADY.accent.soft, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText:  { fontSize: 18, fontWeight: '700', color: STEADY.accent.deep },
  profileText:        { flex: 1 },
  profileName:        { fontSize: 15, fontWeight: '600', color: STEADY.ink.primary },
  profileMeta:        { fontSize: 12, color: STEADY.ink.secondary, marginTop: 1 },
  profileChevron:     { fontSize: 16, color: STEADY.ink.tertiary },
  privacyCard:        {
    padding: 16, borderRadius: STEADY.r.lg, borderWidth: 1,
    borderColor: STEADY.accent.soft, backgroundColor: 'rgba(46,125,122,0.05)',
    marginBottom: 18,
  },
  privacyEyebrow:     { fontSize: 11, fontWeight: '700', color: STEADY.accent.deep, letterSpacing: 1.2, marginBottom: 6 },
  privacyText:        { fontSize: 13, color: STEADY.ink.secondary, fontStyle: 'italic', lineHeight: 19, marginBottom: 10 },
  privacyPoints:      { gap: 3 },
  privacyPoint:       { fontSize: 12, color: STEADY.accent.deep, fontWeight: '500' },
  logoutBtn:          { borderWidth: 1, borderColor: STEADY.emergency.soft, borderRadius: STEADY.r.lg, paddingVertical: 14, alignItems: 'center', marginBottom: 18, backgroundColor: '#fff' },
  logoutText:         { color: STEADY.emergency.base, fontWeight: '600', fontSize: 15 },
  footer:             { alignItems: 'center', gap: 4, paddingTop: 4, paddingBottom: 8 },
  footerApp:          { color: STEADY.ink.secondary, fontWeight: '700', fontSize: 13 },
  footerSub:          { color: STEADY.ink.tertiary, fontSize: 11 },
})
