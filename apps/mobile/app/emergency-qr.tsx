import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Alert, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import { STEADY } from '@repo/ui'
import { seizureLogsApi, contactsApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'
import { exportEmergencyCard, buildQrText } from '@/lib/emergency-card-pdf'
import type { SeizureLog, EmergencyContact } from '@repo/types'

export default function EmergencyQrScreen() {
  const router = useRouter()
  const qrRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [patientNickname, setPatientNickname] = useState('Patient')
  const [logs, setLogs] = useState<SeizureLog[]>([])
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [qrText, setQrText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const patient = await authStorage.getCurrentPatient()
      const nickname = patient?.nickname ?? 'Patient'
      setPatientNickname(nickname)

      const [fetchedLogs, fetchedContacts] = await Promise.allSettled([
        patient?.id ? seizureLogsApi.list(patient.id) : Promise.resolve([]),
        contactsApi.list(),
      ])

      const resolvedLogs = fetchedLogs.status === 'fulfilled' ? fetchedLogs.value : []
      const resolvedContacts = fetchedContacts.status === 'fulfilled' ? fetchedContacts.value : []

      setLogs(resolvedLogs)
      setContacts(resolvedContacts)
      setQrText(buildQrText(nickname, resolvedLogs, resolvedContacts))
    } catch {
      // silently use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handlePrintCard = async () => {
    setExporting(true)
    try {
      await exportEmergencyCard(patientNickname, logs, contacts)
    } catch {
      Alert.alert('Export failed', 'Could not generate the emergency card PDF.')
    } finally {
      setExporting(false)
    }
  }

  const phoneContacts = contacts.filter((c) => c.phoneNumber)
  const realLogs = logs.filter((l) => !l.isFalseAlarm)

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.headerRow}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={STEADY.ink.primary} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.eyebrow}>Emergency</Text>
          <Text style={s.title}>QR Card</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy notice */}
        <View style={s.privacyNotice}>
          <Ionicons name="lock-closed-outline" size={14} color={STEADY.accent.deep} />
          <Text style={s.privacyText}>
            This card lives only on your phone. Nothing is sent to any server.
            Any camera app can scan it — no Steady app needed.
          </Text>
        </View>

        {/* QR code card */}
        <View style={s.qrCard}>
          <View style={s.qrHeaderRow}>
            <Text style={s.qrCardEyebrow}>STEADY EMERGENCY CARD</Text>
          </View>
          <Text style={s.qrPatientName}>{patientNickname}</Text>
          <Text style={s.qrSub}>Epilepsy patient · scan for first-aid instructions</Text>

          <View style={s.qrContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={STEADY.accent.base} />
            ) : qrText ? (
              <QRCode
                value={qrText}
                size={200}
                color="#1A1F24"
                backgroundColor="#ffffff"
                getRef={(ref) => { qrRef.current = ref }}
                ecl="M"
              />
            ) : (
              <View style={s.qrError}>
                <Ionicons name="warning-outline" size={32} color={STEADY.ink.tertiary} />
                <Text style={s.qrErrorText}>Could not generate QR</Text>
              </View>
            )}
          </View>

          {/* Decode preview */}
          {!loading && qrText ? (
            <View style={s.qrPreview}>
              <Text style={s.qrPreviewLabel}>WHEN SCANNED, SHOWS:</Text>
              <Text style={s.qrPreviewText} numberOfLines={6}>{qrText}</Text>
            </View>
          ) : null}
        </View>

        {/* Contact summary */}
        {contacts.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Emergency contacts in QR</Text>
            {contacts.map((c) => (
              <View key={c.id} style={s.contactRow}>
                <View style={s.contactAvatar}>
                  <Text style={s.contactInitial}>{c.nickname[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={s.contactBody}>
                  <Text style={s.contactName}>{c.nickname}</Text>
                  <Text style={s.contactPhone}>
                    {c.phoneNumber ?? 'Push notifications only (no phone number)'}
                  </Text>
                </View>
                {c.phoneNumber ? (
                  <Ionicons name="checkmark-circle" size={18} color={STEADY.accent.base} />
                ) : (
                  <Ionicons name="ellipse-outline" size={18} color={STEADY.ink.tertiary} />
                )}
              </View>
            ))}
            {phoneContacts.length === 0 && (
              <Text style={s.noPhoneNote}>
                Add phone numbers to your contacts so bystanders can call them directly from the QR.
              </Text>
            )}
          </View>
        )}

        {/* Stats */}
        {realLogs.length > 0 && (
          <View style={s.statsRow}>
            <View style={s.statPill}>
              <Text style={s.statNum}>{realLogs.length}</Text>
              <Text style={s.statLabel}>episodes logged</Text>
            </View>
            <View style={s.statPill}>
              <Text style={s.statNum}>{contacts.length}</Text>
              <Text style={s.statLabel}>contacts in QR</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          <Pressable
            style={[s.primaryBtn, exporting && s.btnDisabled]}
            onPress={handlePrintCard}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="print-outline" size={18} color="#fff" />
            }
            <Text style={s.primaryBtnText}>
              {exporting ? 'Generating PDF…' : 'Print Emergency Card (PDF)'}
            </Text>
          </Pressable>

          <Pressable style={s.secondaryBtn} onPress={() => router.push('/contacts')}>
            <Ionicons name="people-outline" size={16} color={STEADY.accent.deep} />
            <Text style={s.secondaryBtnText}>Edit Contacts</Text>
          </Pressable>
        </View>

        {/* How to use */}
        <View style={s.howToCard}>
          <Text style={s.howToTitle}>How to use this QR</Text>
          <View style={s.howToStep}>
            <Text style={s.howToNum}>1</Text>
            <Text style={s.howToText}>Show this screen to a bystander during a seizure — they scan it with any camera app</Text>
          </View>
          <View style={s.howToStep}>
            <Text style={s.howToNum}>2</Text>
            <Text style={s.howToText}>Print the card and laminate it — keep in wallet, school bag, or ID holder</Text>
          </View>
          <View style={s.howToStep}>
            <Text style={s.howToNum}>3</Text>
            <Text style={s.howToText}>Update the QR whenever your contacts or seizure type changes</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: STEADY.bg.light },
  headerRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: STEADY.bg.sunken },
  headerCenter:     { alignItems: 'center' },
  eyebrow:          { fontSize: 11, color: STEADY.ink.secondary, fontWeight: '600' },
  title:            { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: STEADY.ink.primary },

  content:          { paddingHorizontal: 16, paddingBottom: 40 },

  privacyNotice:    {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: STEADY.accent.soft,
    borderRadius: STEADY.r.md, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: STEADY.accent.base + '33',
  },
  privacyText:      { flex: 1, fontSize: 12, color: STEADY.accent.deep, lineHeight: 18 },

  qrCard:           {
    backgroundColor: '#fff', borderRadius: STEADY.r.lg,
    borderWidth: 1, borderColor: STEADY.border.light,
    padding: 20, alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  qrHeaderRow:      { marginBottom: 6 },
  qrCardEyebrow:    { fontSize: 10, fontWeight: '800', color: STEADY.emergency.base, letterSpacing: 1.5 },
  qrPatientName:    { fontSize: 22, fontWeight: '700', color: STEADY.ink.primary, marginBottom: 2 },
  qrSub:            { fontSize: 12, color: STEADY.ink.secondary, marginBottom: 20, textAlign: 'center' },
  qrContainer:      { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: STEADY.border.light, borderRadius: STEADY.r.md, backgroundColor: '#fff', marginBottom: 16 },
  qrError:          { alignItems: 'center', gap: 8 },
  qrErrorText:      { fontSize: 13, color: STEADY.ink.tertiary },

  qrPreview:        { width: '100%', backgroundColor: STEADY.bg.sunken, borderRadius: STEADY.r.md, padding: 12 },
  qrPreviewLabel:   { fontSize: 9, fontWeight: '800', color: STEADY.ink.tertiary, letterSpacing: 1, marginBottom: 6 },
  qrPreviewText:    { fontSize: 10, color: STEADY.ink.secondary, lineHeight: 16, fontFamily: 'monospace' },

  section:          { marginBottom: 16 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: STEADY.ink.secondary, marginBottom: 10 },

  contactRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: STEADY.r.md, padding: 12, borderWidth: 1, borderColor: STEADY.border.light, marginBottom: 6 },
  contactAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: STEADY.accent.soft, alignItems: 'center', justifyContent: 'center' },
  contactInitial:   { fontSize: 15, fontWeight: '700', color: STEADY.accent.deep },
  contactBody:      { flex: 1 },
  contactName:      { fontSize: 14, fontWeight: '600', color: STEADY.ink.primary },
  contactPhone:     { fontSize: 12, color: STEADY.ink.secondary, marginTop: 1 },
  noPhoneNote:      { fontSize: 12, color: STEADY.ink.tertiary, fontStyle: 'italic', marginTop: 4 },

  statsRow:         { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statPill:         { flex: 1, backgroundColor: '#fff', borderRadius: STEADY.r.md, borderWidth: 1, borderColor: STEADY.border.light, padding: 12, alignItems: 'center' },
  statNum:          { fontSize: 22, fontWeight: '700', color: STEADY.accent.base },
  statLabel:        { fontSize: 11, color: STEADY.ink.tertiary, marginTop: 2 },

  actions:          { gap: 10, marginBottom: 16 },
  primaryBtn:       { height: 54, borderRadius: STEADY.r.lg, backgroundColor: STEADY.emergency.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: STEADY.emergency.base, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnDisabled:      { opacity: 0.6 },
  primaryBtnText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn:     { height: 48, borderRadius: STEADY.r.lg, borderWidth: 1.5, borderColor: STEADY.accent.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: STEADY.accent.soft },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: STEADY.accent.deep },

  howToCard:        { backgroundColor: '#fff', borderRadius: STEADY.r.lg, borderWidth: 1, borderColor: STEADY.border.light, padding: 16, gap: 12 },
  howToTitle:       { fontSize: 13, fontWeight: '700', color: STEADY.ink.secondary, marginBottom: 4 },
  howToStep:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howToNum:         { width: 20, height: 20, borderRadius: 10, backgroundColor: STEADY.bg.sunken, textAlign: 'center', lineHeight: 20, fontSize: 11, fontWeight: '700', color: STEADY.ink.secondary },
  howToText:        { flex: 1, fontSize: 13, color: STEADY.ink.secondary, lineHeight: 19 },
})
