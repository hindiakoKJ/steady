import { useEffect, useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { View, Text, FlatList, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { STEADY } from '@repo/ui'
import { seizureLogsApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'
import { exportNeurologistPDF } from '@/lib/pdf'
import type { SeizureLog } from '@repo/types'

function formatDuration(s?: number | null) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

const SEIZURE_TYPE_LABEL: Record<string, string> = {
  'tonic-clonic': 'Full body',
  'absence':      'Absence',
  'focal':        'Focal',
  'myoclonic':    'Myoclonic',
  'unknown':      'Unknown type',
}

const SOURCE_LABEL: Record<string, string> = {
  AURA:    'Self-reported',
  BEACON:  'Via BEACON',
  PASSIVE: 'Auto-detected',
  MANUAL:  'Manual entry',
}

function EventCard({ log }: { log: SeizureLog }) {
  const date = new Date(log.startedAt)
  const month = date.toLocaleString('default', { month: 'short' }).toUpperCase()
  const day = date.getDate()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dur = log.durationSeconds ?? 0
  const isDanger = dur >= 300
  const isFalseAlarm = log.isFalseAlarm

  return (
    <View style={[ev.card, isFalseAlarm && ev.cardFalseAlarm]}>
      <View style={ev.dateCol}>
        <Text style={ev.monthLabel}>{month}</Text>
        <Text style={[ev.dayLabel, isFalseAlarm && ev.dayLabelFaded]}>{day}</Text>
      </View>
      <View style={ev.divider} />
      <View style={ev.body}>
        <View style={ev.typeRow}>
          {isFalseAlarm ? (
            <View style={ev.falseAlarmPill}>
              <Text style={ev.falseAlarmText}>False alarm</Text>
            </View>
          ) : (
            <Text style={ev.typeLabel}>
              {log.seizureType ? SEIZURE_TYPE_LABEL[log.seizureType] : 'Seizure'}
            </Text>
          )}
          {!isFalseAlarm && log.durationSeconds != null && (
            <View style={[ev.durationPill, isDanger ? ev.durationDanger : ev.durationWarn]}>
              <Text style={[ev.durationText, isDanger ? ev.durationTextDanger : ev.durationTextWarn]}>
                {formatDuration(log.durationSeconds)}
              </Text>
            </View>
          )}
          {log.triggeredBy && (
            <Text style={ev.sourceLabel}>{SOURCE_LABEL[log.triggeredBy] ?? log.triggeredBy}</Text>
          )}
        </View>
        <Text style={ev.meta}>
          {time}
          {log.weatherTempC != null ? ` · ${log.weatherTempC}°C ${log.weatherCondition ?? ''}` : ''}
          {log.postictalMinutes != null ? ` · ${log.postictalMinutes}min recovery` : ''}
          {log.injuryOccurred ? ' · ⚠️ Injury' : ''}
        </Text>
        {(log.triggers ?? []).length > 0 && (
          <Text style={ev.triggers}>Triggers: {log.triggers.map((t) => t.replace(/_/g, ' ')).join(', ')}</Text>
        )}
        {log.notes ? <Text style={ev.notes}>{log.notes}</Text> : null}
      </View>
    </View>
  )
}

export default function HistoryScreen() {
  const [logs, setLogs] = useState<SeizureLog[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [patientNickname, setPatientNickname] = useState('Patient')
  const [patientId, setPatientId] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      const load = async () => {
        const patient = await authStorage.getCurrentPatient()
        if (!patient?.id) { setLoading(false); return }
        if (patient.nickname) setPatientNickname(patient.nickname)
        setPatientId(patient.id)
        seizureLogsApi
          .list(patient.id)
          .then(setLogs)
          .catch(() => setLogs([]))
          .finally(() => setLoading(false))
      }
      load()
    }, [])
  )

  const realLogs = logs.filter((l) => !l.isFalseAlarm)
  const falseAlarms = logs.filter((l) => l.isFalseAlarm)

  const totalThisMonth = realLogs.filter((l) => {
    const d = new Date(l.startedAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const avgDuration = realLogs.length > 0
    ? Math.round(realLogs.reduce((sum, l) => sum + (l.durationSeconds ?? 0), 0) / realLogs.length)
    : 0

  const daysSinceLast = realLogs.length > 0
    ? Math.floor((Date.now() - new Date(realLogs[0].startedAt).getTime()) / 86400000)
    : null

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.eyebrow}>Seizure log</Text>
          <Text style={s.title}>History</Text>
        </View>
        <Pressable
          style={[s.exportBtn, exporting && s.exportBtnDisabled]}
          onPress={async () => {
            if (logs.length === 0) {
              Alert.alert('No data', 'Log at least one seizure before exporting.')
              return
            }
            setExporting(true)
            try {
              await exportNeurologistPDF(patientNickname, logs)
            } catch {
              Alert.alert('Export failed', 'Could not generate PDF. Please try again.')
            } finally {
              setExporting(false)
            }
          }}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color={STEADY.accent.deep} />
            : <Ionicons name="download-outline" size={13} color={STEADY.accent.deep} />
          }
          <Text style={s.exportLabel}>{exporting ? 'Generating…' : 'Export PDF'}</Text>
        </Pressable>
      </View>

      {/* Stats strip */}
      {!loading && logs.length > 0 && (
        <View style={s.statsStrip}>
          <View style={s.statCard}>
            <Text style={[s.statNumber, { color: STEADY.emergency.base }]}>{totalThisMonth}</Text>
            <Text style={s.statLabel}>this month</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNumber, { color: STEADY.warn.base }]}>{formatDuration(avgDuration)}</Text>
            <Text style={s.statLabel}>avg duration</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNumber, { color: STEADY.accent.base }]}>
              {daysSinceLast != null ? `${daysSinceLast}d` : '—'}
            </Text>
            <Text style={s.statLabel}>since last</Text>
          </View>
          {falseAlarms.length > 0 && (
            <View style={s.statCard}>
              <Text style={[s.statNumber, { color: STEADY.ink.tertiary }]}>{falseAlarms.length}</Text>
              <Text style={s.statLabel}>false alarms</Text>
            </View>
          )}
        </View>
      )}

      {/* List */}
      {loading ? (
        <Text style={s.emptyText}>Loading…</Text>
      ) : logs.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyTitle}>No seizures logged yet</Text>
          <Text style={s.emptySub}>When you log a seizure from the Emergency Hub, it will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard log={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: STEADY.bg.light },
  headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  eyebrow:      { fontSize: 13, color: STEADY.ink.secondary },
  title:        { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: STEADY.ink.primary },
  exportBtn:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: STEADY.r.pill, borderWidth: 1, borderColor: STEADY.border.light, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 },
  exportBtnDisabled:{ opacity: 0.6 },
  exportLabel:  { fontSize: 13, fontWeight: '600', color: STEADY.accent.deep },
  statsStrip:   { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 8 },
  statCard:     { flex: 1, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderRadius: STEADY.r.md, borderWidth: 1, borderColor: STEADY.border.light },
  statNumber:   { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  statLabel:    { fontSize: 11, color: STEADY.ink.tertiary, marginTop: 3, fontWeight: '500' },
  list:         { paddingHorizontal: 16, paddingBottom: 24 },
  emptyText:    { color: STEADY.ink.secondary, textAlign: 'center', marginTop: 80, fontSize: 15 },
  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyIcon:    { fontSize: 40 },
  emptyTitle:   { fontSize: 17, fontWeight: '600', color: STEADY.ink.primary, textAlign: 'center' },
  emptySub:     { fontSize: 14, color: STEADY.ink.secondary, textAlign: 'center', lineHeight: 21 },
})

const ev = StyleSheet.create({
  card:            { backgroundColor: '#fff', borderRadius: STEADY.r.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: STEADY.border.light, flexDirection: 'row', gap: 12 },
  dateCol:         { width: 40, alignItems: 'center' },
  monthLabel:      { fontSize: 10, color: STEADY.ink.tertiary, fontWeight: '600', letterSpacing: 0.5 },
  dayLabel:        { fontSize: 22, fontWeight: '700', lineHeight: 24, marginTop: 1, color: STEADY.ink.primary },
  divider:         { width: 1, backgroundColor: STEADY.border.light },
  body:            { flex: 1 },
  typeRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeLabel:       { fontSize: 14, fontWeight: '600', color: STEADY.ink.primary },
  durationPill:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  durationWarn:    { backgroundColor: STEADY.warn.soft },
  durationDanger:  { backgroundColor: STEADY.emergency.soft },
  durationText:    { fontSize: 11, fontWeight: '700' },
  durationTextWarn:   { color: STEADY.warn.base },
  durationTextDanger: { color: STEADY.emergency.base },
  meta:            { fontSize: 12, color: STEADY.ink.secondary, marginTop: 3 },
  triggers:        { fontSize: 11, color: STEADY.ink.tertiary, marginTop: 3, fontStyle: 'italic' },
  notes:           { fontSize: 12, color: STEADY.ink.tertiary, marginTop: 4, fontStyle: 'italic' },
  cardFalseAlarm:  { opacity: 0.55, borderStyle: 'dashed' },
  dayLabelFaded:   { color: STEADY.ink.tertiary },
  falseAlarmPill:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: STEADY.bg.sunken, borderWidth: 1, borderColor: STEADY.border.light },
  falseAlarmText:  { fontSize: 11, fontWeight: '600', color: STEADY.ink.tertiary },
  sourceLabel:     { fontSize: 10, color: STEADY.ink.tertiary, fontStyle: 'italic' },
})
