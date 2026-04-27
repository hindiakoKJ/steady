import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Download } from 'lucide-react-native'
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

function EventCard({ log }: { log: SeizureLog }) {
  const date = new Date(log.startedAt)
  const month = date.toLocaleString('default', { month: 'short' }).toUpperCase()
  const day = date.getDate()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dur = log.durationSeconds ?? 0
  const isDanger = dur >= 300

  return (
    <View style={ev.card}>
      <View style={ev.dateCol}>
        <Text style={ev.monthLabel}>{month}</Text>
        <Text style={ev.dayLabel}>{day}</Text>
      </View>
      <View style={ev.divider} />
      <View style={ev.body}>
        <View style={ev.typeRow}>
          <Text style={ev.typeLabel}>Seizure</Text>
          {log.durationSeconds != null && (
            <View style={[ev.durationPill, isDanger ? ev.durationDanger : ev.durationWarn]}>
              <Text style={[ev.durationText, isDanger ? ev.durationTextDanger : ev.durationTextWarn]}>
                {formatDuration(log.durationSeconds)}
              </Text>
            </View>
          )}
        </View>
        <Text style={ev.meta}>{time}{log.weatherTempC != null ? ` · ${log.weatherTempC}°C ${log.weatherCondition ?? ''}` : ''}</Text>
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

  useEffect(() => {
    const load = async () => {
      const patient = await authStorage.getCurrentPatient()
      if (!patient?.id) { setLoading(false); return }
      if (patient.nickname) setPatientNickname(patient.nickname)
      seizureLogsApi
        .list(patient.id)
        .then(setLogs)
        .catch(() => setLogs([]))
        .finally(() => setLoading(false))
    }
    load()
  }, [])

  const totalThisMonth = logs.filter((l) => {
    const d = new Date(l.startedAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const avgDuration = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.durationSeconds ?? 0), 0) / logs.length)
    : 0

  const daysSinceLast = logs.length > 0
    ? Math.floor((Date.now() - new Date(logs[0].startedAt).getTime()) / 86400000)
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
            : <Download size={13} color={STEADY.accent.deep} />
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
  typeRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeLabel:       { fontSize: 14, fontWeight: '600', color: STEADY.ink.primary },
  durationPill:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  durationWarn:    { backgroundColor: STEADY.warn.soft },
  durationDanger:  { backgroundColor: STEADY.emergency.soft },
  durationText:    { fontSize: 11, fontWeight: '700' },
  durationTextWarn:   { color: STEADY.warn.base },
  durationTextDanger: { color: STEADY.emergency.base },
  meta:            { fontSize: 12, color: STEADY.ink.secondary, marginTop: 3 },
  notes:           { fontSize: 12, color: STEADY.ink.tertiary, marginTop: 4, fontStyle: 'italic' },
})
