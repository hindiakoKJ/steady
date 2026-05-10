import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { STEADY } from '@repo/ui'
import { seizureLogsApi, contactsApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'
import { exportEmergencyCard } from '@/lib/emergency-card-pdf'
import type { SeizureLog, EmergencyContact } from '@repo/types'

const SEIZURE_TYPE_LABEL: Record<string, string> = {
  'tonic-clonic': 'Tonic-clonic (full body)',
  'absence':      'Absence (staring)',
  'focal':        'Focal (one side)',
  'myoclonic':    'Myoclonic (quick jerks)',
  'unknown':      'Unknown type',
}

function getMostCommonSeizureType(logs: SeizureLog[]): string {
  const real = logs.filter((l) => !l.isFalseAlarm && l.seizureType)
  if (real.length === 0) return 'Epileptic seizures'
  const counts: Record<string, number> = {}
  real.forEach((l) => { const t = l.seizureType!; counts[t] = (counts[t] ?? 0) + 1 })
  const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]
  return top ? (SEIZURE_TYPE_LABEL[top[0]] ?? top[0]) : 'Epileptic seizures'
}

function getTopTriggers(logs: SeizureLog[]): string {
  const real = logs.filter((l) => !l.isFalseAlarm)
  const counts: Record<string, number> = {}
  real.forEach((l) => (l.triggers ?? []).forEach((t) => { counts[t] = (counts[t] ?? 0) + 1 }))
  const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 4).map(([t]) => t.replace(/_/g, ' '))
  return top.length > 0 ? top.join(' · ') : ''
}

function getAvgDuration(logs: SeizureLog[]): string {
  const real = logs.filter((l) => !l.isFalseAlarm && l.durationSeconds != null)
  if (real.length === 0) return ''
  const avg = Math.round(real.reduce((s, l) => s + (l.durationSeconds ?? 0), 0) / real.length)
  const m = Math.floor(avg / 60)
  const sec = avg % 60
  return m > 0 ? `${m}m ${sec}s avg` : `${sec}s avg`
}

export default function EmergencyIdScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [patientNickname, setPatientNickname] = useState('Patient')
  const [logs, setLogs] = useState<SeizureLog[]>([])
  const [contacts, setContacts] = useState<EmergencyContact[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const patient = await authStorage.getCurrentPatient()
      if (patient?.nickname) setPatientNickname(patient.nickname)
      const [fetchedLogs, fetchedContacts] = await Promise.all([
        patient?.id ? seizureLogsApi.list(patient.id) : Promise.resolve([]),
        contactsApi.list(),
      ])
      setLogs(fetchedLogs)
      setContacts(fetchedContacts)
    } catch {
      Alert.alert('Error', 'Could not load patient data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const seizureType = getMostCommonSeizureType(logs)
  const triggers = getTopTriggers(logs)
  const avgDuration = getAvgDuration(logs)
  const totalEpisodes = logs.filter((l) => !l.isFalseAlarm).length

  const handlePrint = async () => {
    setExporting(true)
    try {
      await exportEmergencyCard(patientNickname, logs, contacts)
    } catch {
      Alert.alert('Error', 'Could not generate PDF.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={STEADY.ink.onDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Medical Alert</Text>
          <Text style={s.title}>Emergency ID Card</Text>
        </View>
        <Pressable
          style={[s.printBtn, exporting && { opacity: 0.6 }]}
          onPress={handlePrint}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color={STEADY.accent.base} />
            : <Ionicons name="print-outline" size={16} color={STEADY.accent.base} />
          }
          <Text style={s.printLabel}>{exporting ? 'Generating…' : 'Print PDF'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={STEADY.accent.base} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Flip hint */}
          <Text style={s.flipHint}>
            {flipped ? 'Showing back — tap card to flip' : 'Showing front — tap card to flip'}
          </Text>

          {/* ── ID CARD ── */}
          <Pressable onPress={() => setFlipped((f) => !f)} style={s.cardWrap}>
            {!flipped ? (
              /* ── FRONT ── */
              <View style={s.card}>
                {/* Red header */}
                <View style={s.cardHeader}>
                  <View>
                    <Text style={s.cardTag}>MEDICAL ALERT</Text>
                    <Text style={s.cardHeaderTitle}>EPILEPSY CARD</Text>
                  </View>
                  <View style={s.seizureBadge}>
                    <Text style={s.seizureBadgeIcon}>🚨</Text>
                    <Text style={s.seizureBadgeText}>SEIZURE{'\n'}PRONE</Text>
                  </View>
                </View>

                {/* Body */}
                <View style={s.cardBody}>
                  <Text style={s.patientLabel}>PATIENT</Text>
                  <Text style={s.patientName}>{patientNickname}</Text>
                  <Text style={s.patientCondition}>
                    Has epilepsy{totalEpisodes > 0 ? ` · ${totalEpisodes} episodes on record` : ''}
                  </Text>

                  <View style={s.infoGrid}>
                    <View style={s.infoCell}>
                      <Text style={s.infoCellLabel}>SEIZURE TYPE</Text>
                      <Text style={s.infoCellValue}>{seizureType}</Text>
                    </View>
                    {avgDuration ? (
                      <View style={s.infoCell}>
                        <Text style={s.infoCellLabel}>AVG DURATION</Text>
                        <Text style={s.infoCellValue}>{avgDuration}</Text>
                      </View>
                    ) : null}
                    {triggers ? (
                      <View style={[s.infoCell, { flex: 1, width: '100%' }]}>
                        <Text style={s.infoCellLabel}>KNOWN TRIGGERS</Text>
                        <Text style={s.infoCellValue}>{triggers}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Footer */}
                <View style={s.cardFooter}>
                  <Text style={s.cardFooterApp}>Steady — Free epilepsy companion</Text>
                  <Text style={s.cardFooterDate}>
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            ) : (
              /* ── BACK ── */
              <View style={[s.card, s.cardBack]}>
                {/* Red header */}
                <View style={s.cardHeader}>
                  <Text style={s.backHeaderTitle}>⚡ If I am having a seizure — here's what to do</Text>
                </View>

                {/* Steps + contacts */}
                <View style={s.backBody}>
                  <View style={s.stepsCol}>
                    {[
                      { n: '1', text: 'Stay calm and time the seizure' },
                      { n: '2', text: 'Roll me on my LEFT side' },
                      { n: '3', text: 'Clear hard objects away from me' },
                      { n: '4', text: 'Stay until I am fully awake' },
                    ].map((step) => (
                      <View key={step.n} style={s.stepRow}>
                        <View style={s.stepNum}>
                          <Text style={s.stepNumText}>{step.n}</Text>
                        </View>
                        <Text style={s.stepText}>{step.text}</Text>
                      </View>
                    ))}
                  </View>

                  {contacts.length > 0 && (
                    <View style={s.contactsCol}>
                      <Text style={s.contactsTitle}>CALL MY FAMILY</Text>
                      {contacts.slice(0, 3).map((c) => (
                        <View key={c.id} style={s.contactItem}>
                          <Text style={s.contactItemName}>{c.nickname}</Text>
                          {c.phoneNumber
                            ? <Text style={s.contactItemPhone}>{c.phoneNumber}</Text>
                            : <Text style={s.contactItemPush}>app alert only</Text>
                          }
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* DO NOT strip */}
                <View style={s.doNotStrip}>
                  <Text style={s.doNotLabel}>DO NOT  </Text>
                  <Text style={s.doNotItem}>✗ Hold me down  </Text>
                  <Text style={s.doNotItem}>✗ Put anything in my mouth  </Text>
                  <Text style={s.doNotItem}>✗ Leave me alone</Text>
                </View>

                {/* Footer */}
                <View style={s.cardFooter}>
                  <Text style={[s.cardFooterApp, { color: STEADY.emergency.base }]}>
                    📞 Call 911 if seizure {'>'} 5 minutes
                  </Text>
                  <Text style={[s.cardFooterDate, { color: '#5A6470' }]}>Steady App</Text>
                </View>
              </View>
            )}
          </Pressable>

          {/* Flip indicator dots */}
          <View style={s.dots}>
            <View style={[s.dot, !flipped && s.dotActive]} />
            <View style={[s.dot, flipped && s.dotActive]} />
          </View>

          {/* Share info */}
          <Text style={s.shareHint}>
            Tap the card to flip between front and back.{'\n'}
            Use Print PDF to save a printable version for your wallet.
          </Text>

        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: STEADY.bg.dark },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  eyebrow:          { fontSize: 11, color: STEADY.ink.onDarkSec },
  title:            { fontSize: 20, fontWeight: '700', color: STEADY.ink.onDark },
  printBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: STEADY.r.pill, borderWidth: 1, borderColor: STEADY.accent.deep, backgroundColor: STEADY.accent.softDark },
  printLabel:       { fontSize: 12, fontWeight: '600', color: STEADY.accent.base },
  loadingWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:           { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
  flipHint:         { fontSize: 12, color: STEADY.ink.onDarkSec, marginBottom: 16, textAlign: 'center' },

  // ── Card ──
  cardWrap:         { width: '100%', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  card:             { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' },
  cardBack:         { backgroundColor: '#1A1F24' },

  // Front header
  cardHeader:       { backgroundColor: STEADY.emergency.base, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTag:          { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' },
  cardHeaderTitle:  { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  seizureBadge:     { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  seizureBadgeIcon: { fontSize: 18 },
  seizureBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 0.5, lineHeight: 11 },

  // Front body
  cardBody:         { padding: 20, gap: 4 },
  patientLabel:     { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: '#8B95A1' },
  patientName:      { fontSize: 28, fontWeight: '900', color: '#1A1F24', letterSpacing: -0.5, lineHeight: 32 },
  patientCondition: { fontSize: 12, fontWeight: '600', color: STEADY.emergency.base, marginBottom: 12 },
  infoGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoCell:         { backgroundColor: '#F8F5F0', borderRadius: 10, padding: 10, minWidth: '45%' },
  infoCellLabel:    { fontSize: 8, fontWeight: '700', letterSpacing: 1.2, color: '#8B95A1', marginBottom: 3 },
  infoCellValue:    { fontSize: 13, fontWeight: '700', color: '#1A1F24', lineHeight: 17 },

  // Card footer
  cardFooter:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#EDE8E0', paddingHorizontal: 20, paddingVertical: 10 },
  cardFooterApp:    { fontSize: 10, fontWeight: '700', color: STEADY.accent.deep },
  cardFooterDate:   { fontSize: 9, color: '#aaa' },

  // Back
  backHeaderTitle:  { fontSize: 12, fontWeight: '800', color: '#fff', flex: 1 },
  backBody:         { flexDirection: 'row', padding: 16, gap: 16 },
  stepsCol:         { flex: 1, gap: 10 },
  stepRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepNum:          { width: 20, height: 20, borderRadius: 10, backgroundColor: STEADY.accent.base, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText:      { fontSize: 10, fontWeight: '900', color: '#fff' },
  stepText:         { fontSize: 12, color: '#F2F4F7', fontWeight: '500', lineHeight: 17, flex: 1 },
  contactsCol:      { width: 130, gap: 8 },
  contactsTitle:    { fontSize: 8, fontWeight: '700', letterSpacing: 1.2, color: '#A8B2BD' },
  contactItem:      { gap: 1 },
  contactItemName:  { fontSize: 12, fontWeight: '700', color: '#F2F4F7' },
  contactItemPhone: { fontSize: 13, fontWeight: '900', color: STEADY.emergency.base },
  contactItemPush:  { fontSize: 10, color: '#5A6470' },
  doNotStrip:       { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(200,49,43,0.15)', borderTopWidth: 1, borderColor: 'rgba(200,49,43,0.3)', paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  doNotLabel:       { fontSize: 10, fontWeight: '900', color: STEADY.emergency.base },
  doNotItem:        { fontSize: 10, color: '#F2F4F7', fontWeight: '500' },

  // Dots + hint
  dots:             { flexDirection: 'row', gap: 6, marginTop: 20, marginBottom: 8 },
  dot:              { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive:        { backgroundColor: STEADY.accent.base, width: 18 },
  shareHint:        { fontSize: 12, color: STEADY.ink.onDarkSec, textAlign: 'center', lineHeight: 18, marginTop: 4 },
})
