import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, Pressable, StyleSheet, FlatList,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STEADY } from '@repo/ui'
import type { VitalEntry, VitalType } from '@repo/types'

const VITALS_KEY = '@steady/vitals'

interface VitalConfig {
  label: string
  unit: string
  icon: string
  color: string
  bg: string
  normal: string
  placeholder: string
  min: number
  max: number
}

const VITAL_CONFIG: Record<VitalType, VitalConfig> = {
  heart_rate: {
    label: 'Heart Rate',
    unit: 'bpm',
    icon: '❤️',
    color: STEADY.emergency.base as string,
    bg: STEADY.emergency.soft as string,
    normal: '60–100 bpm',
    placeholder: 'e.g. 75',
    min: 20,
    max: 250,
  },
  spo2: {
    label: 'Blood Oxygen (SpO₂)',
    unit: '%',
    icon: '💧',
    color: '#3B82F6',
    bg: '#EFF6FF',
    normal: '95–100%',
    placeholder: 'e.g. 98',
    min: 50,
    max: 100,
  },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const C_ACCENT = STEADY.accent.base as string
const C_WARN = STEADY.warn.base as string
const C_DANGER = STEADY.emergency.base as string

function getStatusColor(type: VitalType, value: number): string {
  if (type === 'heart_rate') {
    if (value < 60 || value > 100) return C_WARN
    if (value < 50 || value > 130) return C_DANGER
    return C_ACCENT
  }
  if (type === 'spo2') {
    if (value < 90) return C_DANGER
    if (value < 95) return C_WARN
    return C_ACCENT
  }
  return C_ACCENT
}

function StatusLabel({ type, value }: { type: VitalType; value: number }) {
  let label = 'Normal'
  let color: string = C_ACCENT
  if (type === 'heart_rate') {
    if (value < 60) { label = 'Low (bradycardia)'; color = C_WARN }
    else if (value > 100) { label = 'Elevated (tachycardia)'; color = C_WARN }
    else if (value > 130) { label = 'High'; color = C_DANGER }
  }
  if (type === 'spo2') {
    if (value < 90) { label = 'Critical'; color = C_DANGER }
    else if (value < 95) { label = 'Low'; color = C_WARN }
  }
  return <Text style={[s.statusLabel, { color }]}>{label}</Text>
}

export default function VitalsScreen() {
  const router = useRouter()
  const [vitals, setVitals] = useState<VitalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<VitalType>('heart_rate')
  const [inputValue, setInputValue] = useState('')
  const [inputNote, setInputNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await AsyncStorage.getItem(VITALS_KEY)
      setVitals(raw ? JSON.parse(raw) : [])
    } catch {
      setVitals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = (type: VitalType) => {
    setModalType(type)
    setInputValue('')
    setInputNote('')
    setShowModal(true)
  }

  const handleSave = async () => {
    const config = VITAL_CONFIG[modalType]
    const num = parseFloat(inputValue)
    if (isNaN(num) || num < config.min || num > config.max) {
      Alert.alert('Invalid value', `Please enter a value between ${config.min} and ${config.max} ${config.unit}.`)
      return
    }
    setSaving(true)
    try {
      const entry: VitalEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: modalType,
        value: num,
        note: inputNote.trim() || undefined,
        recordedAt: new Date().toISOString(),
      }
      const updated = [entry, ...vitals]
      await AsyncStorage.setItem(VITALS_KEY, JSON.stringify(updated))
      setVitals(updated)
      setShowModal(false)
    } catch {
      Alert.alert('Error', 'Could not save vital. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete entry',
      'Remove this vital reading?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = vitals.filter((v) => v.id !== id)
            await AsyncStorage.setItem(VITALS_KEY, JSON.stringify(updated))
            setVitals(updated)
          },
        },
      ]
    )
  }

  // Latest reading per type
  const latestHR = vitals.find((v) => v.type === 'heart_rate')
  const latestSpO2 = vitals.find((v) => v.type === 'spo2')

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.headerRow}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={STEADY.ink.primary} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.eyebrow}>Health Tracking</Text>
          <Text style={s.title}>Vitals</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Privacy badge */}
      <View style={s.privacyBadge}>
        <Ionicons name="phone-portrait-outline" size={13} color={STEADY.accent.deep} />
        <Text style={s.privacyText}>Stored locally on your device only — never uploaded</Text>
      </View>

      {/* Latest readings */}
      <View style={s.statsRow}>
        {(['heart_rate', 'spo2'] as VitalType[]).map((type) => {
          const cfg = VITAL_CONFIG[type]
          const latest = type === 'heart_rate' ? latestHR : latestSpO2
          return (
            <Pressable key={type} style={s.statCard} onPress={() => openAdd(type)}>
              <Text style={s.statIcon}>{cfg.icon}</Text>
              {latest ? (
                <>
                  <Text style={[s.statValue, { color: getStatusColor(type, latest.value) }]}>
                    {latest.value}
                    <Text style={s.statUnit}> {cfg.unit}</Text>
                  </Text>
                  <StatusLabel type={type} value={latest.value} />
                  <Text style={s.statDate}>{formatDate(latest.recordedAt)}</Text>
                </>
              ) : (
                <>
                  <Text style={s.statEmpty}>—</Text>
                  <Text style={s.statNormal}>Normal: {cfg.normal}</Text>
                </>
              )}
              <Text style={s.statLabel}>{cfg.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* Add buttons */}
      <View style={s.addRow}>
        {(['heart_rate', 'spo2'] as VitalType[]).map((type) => {
          const cfg = VITAL_CONFIG[type]
          return (
            <Pressable
              key={type}
              style={[s.addBtn, { borderColor: cfg.color, backgroundColor: cfg.bg }]}
              onPress={() => openAdd(type)}
            >
              <Ionicons name="add-circle-outline" size={15} color={cfg.color} />
              <Text style={[s.addBtnText, { color: cfg.color }]}>Log {cfg.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={STEADY.accent.base} />
      ) : vitals.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>💓</Text>
          <Text style={s.emptyTitle}>No vitals logged yet</Text>
          <Text style={s.emptySub}>
            Track heart rate and blood oxygen levels — especially useful after a seizure to monitor recovery.
          </Text>
        </View>
      ) : (
        <FlatList
          data={vitals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={s.listHeader}>
              {vitals.length} reading{vitals.length !== 1 ? 's' : ''} · most recent first
            </Text>
          }
          renderItem={({ item }) => {
            const cfg = VITAL_CONFIG[item.type]
            const statusColor = getStatusColor(item.type, item.value)
            return (
              <Pressable style={s.entryCard} onLongPress={() => handleDelete(item.id)}>
                <View style={[s.entryIcon, { backgroundColor: cfg.bg }]}>
                  <Text style={{ fontSize: 18 }}>{cfg.icon}</Text>
                </View>
                <View style={s.entryBody}>
                  <View style={s.entryTopRow}>
                    <Text style={s.entryType}>{cfg.label}</Text>
                    <Text style={[s.entryValue, { color: statusColor }]}>
                      {item.value} {cfg.unit}
                    </Text>
                  </View>
                  <Text style={s.entryDate}>
                    {formatDate(item.recordedAt)} · {formatTime(item.recordedAt)}
                  </Text>
                  {item.note ? <Text style={s.entryNote}>{item.note}</Text> : null}
                </View>
              </Pressable>
            )
          }}
        />
      )}

      {/* Add Vital Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setShowModal(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <Text style={s.modalTitle}>Log {VITAL_CONFIG[modalType].label}</Text>
            <Text style={s.modalSub}>Normal range: {VITAL_CONFIG[modalType].normal}</Text>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>
                Reading ({VITAL_CONFIG[modalType].unit})
              </Text>
              <TextInput
                style={s.input}
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="numeric"
                placeholder={VITAL_CONFIG[modalType].placeholder}
                placeholderTextColor={STEADY.ink.tertiary}
                autoFocus
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Note (optional)</Text>
              <TextInput
                style={[s.input, s.inputMulti]}
                value={inputNote}
                onChangeText={setInputNote}
                placeholder="e.g. Measured after seizure, feeling dizzy"
                placeholderTextColor={STEADY.ink.tertiary}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={s.modalBtns}>
              <Pressable style={s.modalCancelBtn} onPress={() => setShowModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.modalSaveBtn, saving && s.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.modalSaveText}>Save</Text>
                }
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: STEADY.bg.light },
  headerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: STEADY.bg.sunken },
  headerCenter:   { alignItems: 'center' },
  eyebrow:        { fontSize: 11, color: STEADY.ink.secondary, fontWeight: '600' },
  title:          { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: STEADY.ink.primary },

  privacyBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 12, justifyContent: 'center' },
  privacyText:    { fontSize: 11, color: STEADY.accent.deep },

  statsRow:       { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statCard:       {
    flex: 1, backgroundColor: '#fff', borderRadius: STEADY.r.lg,
    borderWidth: 1, borderColor: STEADY.border.light,
    padding: 14, alignItems: 'center', gap: 2,
  },
  statIcon:       { fontSize: 24, marginBottom: 4 },
  statValue:      { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  statUnit:       { fontSize: 14, fontWeight: '500' },
  statEmpty:      { fontSize: 26, fontWeight: '700', color: STEADY.ink.tertiary },
  statNormal:     { fontSize: 10, color: STEADY.ink.tertiary },
  statusLabel:    { fontSize: 11, fontWeight: '600' },
  statDate:       { fontSize: 10, color: STEADY.ink.tertiary, marginTop: 1 },
  statLabel:      { fontSize: 11, color: STEADY.ink.secondary, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  addRow:         { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  addBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: STEADY.r.md, borderWidth: 1.5 },
  addBtnText:     { fontSize: 13, fontWeight: '600' },

  list:           { paddingHorizontal: 16, paddingBottom: 32 },
  listHeader:     { fontSize: 12, color: STEADY.ink.tertiary, marginBottom: 10 },

  entryCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: STEADY.r.md, padding: 12, borderWidth: 1, borderColor: STEADY.border.light, marginBottom: 8 },
  entryIcon:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  entryBody:      { flex: 1 },
  entryTopRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryType:      { fontSize: 13, fontWeight: '600', color: STEADY.ink.primary },
  entryValue:     { fontSize: 16, fontWeight: '700' },
  entryDate:      { fontSize: 11, color: STEADY.ink.tertiary, marginTop: 2 },
  entryNote:      { fontSize: 12, color: STEADY.ink.secondary, marginTop: 3, fontStyle: 'italic' },

  emptyState:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 40, gap: 10 },
  emptyIcon:      { fontSize: 40 },
  emptyTitle:     { fontSize: 17, fontWeight: '600', color: STEADY.ink.primary },
  emptySub:       { fontSize: 13, color: STEADY.ink.secondary, textAlign: 'center', lineHeight: 20 },

  modalOverlay:   { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: STEADY.border.light, alignSelf: 'center', marginBottom: 20 },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: STEADY.ink.primary, marginBottom: 4 },
  modalSub:       { fontSize: 13, color: STEADY.ink.secondary, marginBottom: 20 },

  inputGroup:     { marginBottom: 16 },
  inputLabel:     { fontSize: 12, fontWeight: '600', color: STEADY.ink.secondary, marginBottom: 6 },
  input:          { borderWidth: 1.5, borderColor: STEADY.border.light, borderRadius: STEADY.r.md, padding: 12, fontSize: 16, color: STEADY.ink.primary, backgroundColor: STEADY.bg.light },
  inputMulti:     { height: 72, textAlignVertical: 'top', fontSize: 14 },

  modalBtns:      { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, height: 50, borderRadius: STEADY.r.lg, borderWidth: 1.5, borderColor: STEADY.border.light, alignItems: 'center', justifyContent: 'center' },
  modalCancelText:{ fontSize: 15, fontWeight: '600', color: STEADY.ink.secondary },
  modalSaveBtn:   { flex: 2, height: 50, borderRadius: STEADY.r.lg, backgroundColor: STEADY.accent.base, alignItems: 'center', justifyContent: 'center' },
  modalSaveText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled:    { opacity: 0.6 },
})
