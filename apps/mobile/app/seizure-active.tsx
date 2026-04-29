import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, Alert, Modal, ScrollView, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STEADY } from '@repo/ui'
import { seizureLogsApi } from '@/lib/api'
import type { SeizureType, SeizureTrigger } from '@repo/types'

const RING_SIZE = 280
const FALSE_ALARM_THRESHOLD = 5  // seconds

const AID_STEPS = [
  { title: 'Stay calm and stay with them', desc: 'Do not leave the person alone.' },
  { title: 'Roll them onto their left side', desc: 'This keeps the airway clear and safe.' },
  { title: 'Clear the area around them', desc: 'Move hard or sharp objects away.' },
  { title: 'Do NOT put anything in their mouth', desc: 'They cannot swallow their tongue.' },
]

const SEIZURE_TYPES: { value: SeizureType; label: string; desc: string }[] = [
  { value: 'tonic-clonic', label: 'Full body shaking', desc: 'Body stiffens then jerks rhythmically' },
  { value: 'absence',      label: 'Staring / blank',  desc: 'Blank stare, unresponsive briefly' },
  { value: 'focal',        label: 'One side / partial', desc: 'One limb or side of body only' },
  { value: 'myoclonic',    label: 'Quick jerks',       desc: 'Brief, sudden muscle jerks' },
  { value: 'unknown',      label: 'Not sure',          desc: 'I couldn\'t tell the type' },
]

const TRIGGER_OPTIONS: { value: SeizureTrigger; label: string; emoji: string }[] = [
  { value: 'missed_meds',     label: 'Missed medication',  emoji: '💊' },
  { value: 'stress',          label: 'Stress / anxiety',   emoji: '😰' },
  { value: 'sleep',           label: 'Poor sleep',         emoji: '😴' },
  { value: 'heat',            label: 'Heat / fever',       emoji: '🌡️' },
  { value: 'illness',         label: 'Sick / illness',     emoji: '🤒' },
  { value: 'flashing_lights', label: 'Flashing lights',    emoji: '⚡' },
  { value: 'alcohol',         label: 'Alcohol',            emoji: '🍺' },
  { value: 'menstrual',       label: 'Menstrual cycle',    emoji: '📅' },
  { value: 'unknown',         label: 'Unknown',            emoji: '❓' },
]

export default function SeizureActive() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(0)
  const [ending, setEnding] = useState(false)
  const [aidStep, setAidStep] = useState(0)
  const [videoReminderVisible, setVideoReminderVisible] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Post-seizure notes modal
  const [notesModal, setNotesModal] = useState(false)
  const [seizureType, setSeizureType] = useState<SeizureType | null>(null)
  const [triggers, setTriggers] = useState<SeizureTrigger[]>([])
  const [consciousnessLost, setConsciousnessLost] = useState<boolean | null>(null)
  const [injuryOccurred, setInjuryOccurred] = useState<boolean | null>(null)
  const [postictalMinutes, setPostictalMinutes] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Cache the log id when we enter (so End works even if storage is cleared)
  const logIdRef = useRef<string | null>(null)
  useEffect(() => {
    AsyncStorage.getItem('@steady/activeSeizureLogId').then((id) => {
      logIdRef.current = id
    })
  }, [])

  useEffect(() => {
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Advance first-aid step every 30 seconds (skip step 0 — video reminder covers it)
  useEffect(() => {
    if (seconds > 0 && seconds % 30 === 0 && aidStep < AID_STEPS.length - 1) {
      setAidStep((s) => s + 1)
    }
  }, [seconds])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const past5 = seconds >= 300

  // ── End seizure — check false alarm threshold ────────────────────────────
  const handleEnd = useCallback(() => {
    if (ending) return
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (seconds < FALSE_ALARM_THRESHOLD) {
      Alert.alert(
        'That was very short',
        `Only ${seconds}s — was this a real seizure or an accidental tap?`,
        [
          {
            text: 'False alarm',
            onPress: () => saveAndExit(true),
          },
          {
            text: 'Real — log it',
            onPress: () => openNotesModal(),
          },
        ],
      )
      return
    }
    openNotesModal()
  }, [seconds, ending])

  const openNotesModal = () => {
    setEnding(true)
    setNotesModal(true)
  }

  const saveAndExit = useCallback(async (isFalseAlarm: boolean) => {
    setSaving(true)
    setNotesModal(false)
    try {
      const id = logIdRef.current
      if (id) {
        await seizureLogsApi.end(id, {
          endedAt: new Date().toISOString(),
          isFalseAlarm,
          seizureType: isFalseAlarm ? undefined : (seizureType ?? undefined),
          triggers: isFalseAlarm ? [] : triggers,
          consciousnessLost: isFalseAlarm ? undefined : (consciousnessLost ?? undefined),
          injuryOccurred: isFalseAlarm ? undefined : (injuryOccurred ?? undefined),
          postictalMinutes: isFalseAlarm ? undefined : (postictalMinutes ?? undefined),
          notes: isFalseAlarm ? undefined : (notes.trim() || undefined),
        })
        await AsyncStorage.removeItem('@steady/activeSeizureLogId')
      }
      router.back()
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.')
      setSaving(false)
      setEnding(false)
    }
  }, [seizureType, triggers, consciousnessLost, injuryOccurred, postictalMinutes, notes, router])

  const toggleTrigger = (t: SeizureTrigger) => {
    setTriggers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  const step = AID_STEPS[aidStep]

  return (
    <SafeAreaView style={[s.root, past5 && s.rootDanger]}>
      {/* ── Post-seizure Notes Modal ─────────────────────────────────────── */}
      <Modal visible={notesModal} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <Text style={m.title}>What happened?</Text>
            <Text style={m.sub}>Quick notes help your neurologist. Skip anything you're unsure about.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              {/* Seizure type */}
              <Text style={m.sectionLabel}>TYPE OF SEIZURE</Text>
              <View style={m.typeGrid}>
                {SEIZURE_TYPES.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[m.typeCard, seizureType === t.value && m.typeCardSelected]}
                    onPress={() => setSeizureType(t.value)}
                  >
                    <Text style={[m.typeCardLabel, seizureType === t.value && m.typeCardLabelSelected]}>
                      {t.label}
                    </Text>
                    <Text style={m.typeCardDesc}>{t.desc}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Triggers */}
              <Text style={m.sectionLabel}>POSSIBLE TRIGGERS</Text>
              <View style={m.triggerGrid}>
                {TRIGGER_OPTIONS.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[m.triggerChip, triggers.includes(t.value) && m.triggerChipSelected]}
                    onPress={() => toggleTrigger(t.value)}
                  >
                    <Text style={m.triggerEmoji}>{t.emoji}</Text>
                    <Text style={[m.triggerLabel, triggers.includes(t.value) && m.triggerLabelSelected]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Yes/No questions */}
              <Text style={m.sectionLabel}>DURING THE SEIZURE</Text>
              <View style={m.yesNoRow}>
                <Text style={m.yesNoQuestion}>Lost consciousness?</Text>
                <View style={m.yesNoBtns}>
                  <Pressable
                    style={[m.yesNoBtn, consciousnessLost === true && m.yesNoBtnYes]}
                    onPress={() => setConsciousnessLost(true)}
                  >
                    <Text style={[m.yesNoBtnText, consciousnessLost === true && m.yesNoBtnTextActive]}>Yes</Text>
                  </Pressable>
                  <Pressable
                    style={[m.yesNoBtn, consciousnessLost === false && m.yesNoBtnNo]}
                    onPress={() => setConsciousnessLost(false)}
                  >
                    <Text style={[m.yesNoBtnText, consciousnessLost === false && m.yesNoBtnTextActive]}>No</Text>
                  </Pressable>
                </View>
              </View>
              <View style={[m.yesNoRow, { marginTop: 8 }]}>
                <Text style={m.yesNoQuestion}>Any injury?</Text>
                <View style={m.yesNoBtns}>
                  <Pressable
                    style={[m.yesNoBtn, injuryOccurred === true && m.yesNoBtnYes]}
                    onPress={() => setInjuryOccurred(true)}
                  >
                    <Text style={[m.yesNoBtnText, injuryOccurred === true && m.yesNoBtnTextActive]}>Yes</Text>
                  </Pressable>
                  <Pressable
                    style={[m.yesNoBtn, injuryOccurred === false && m.yesNoBtnNo]}
                    onPress={() => setInjuryOccurred(false)}
                  >
                    <Text style={[m.yesNoBtnText, injuryOccurred === false && m.yesNoBtnTextActive]}>No</Text>
                  </Pressable>
                </View>
              </View>

              {/* Recovery time */}
              <Text style={m.sectionLabel}>RECOVERY TIME (POSTICTAL)</Text>
              <View style={m.stepperRow}>
                <Text style={m.stepperLabel}>
                  {postictalMinutes != null ? `${postictalMinutes} min` : 'Not recorded'}
                </Text>
                <View style={m.stepperBtns}>
                  <Pressable
                    style={m.stepperBtn}
                    onPress={() => setPostictalMinutes((p) => Math.max(0, (p ?? 0) - 5))}
                  >
                    <Text style={m.stepperBtnText}>−5</Text>
                  </Pressable>
                  <Pressable
                    style={m.stepperBtn}
                    onPress={() => setPostictalMinutes((p) => (p ?? 0) + 5)}
                  >
                    <Text style={m.stepperBtnText}>+5</Text>
                  </Pressable>
                  <Pressable
                    style={[m.stepperBtn, { borderColor: STEADY.border.light }]}
                    onPress={() => setPostictalMinutes(null)}
                  >
                    <Text style={[m.stepperBtnText, { color: STEADY.ink.tertiary }]}>Clear</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={m.stepperHint}>How long until they were back to normal after the seizure ended?</Text>

              {/* Free-text notes */}
              <Text style={[m.sectionLabel, { marginTop: 20 }]}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={m.notesInput}
                placeholder="Anything else worth noting for the neurologist…"
                placeholderTextColor={STEADY.ink.tertiary}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                maxLength={500}
              />

              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Actions */}
            <View style={m.actions}>
              <Pressable style={m.skipBtn} onPress={() => saveAndExit(false)} disabled={saving}>
                <Text style={m.skipBtnText}>{saving ? 'Saving…' : 'Skip — save as-is'}</Text>
              </Pressable>
              <Pressable
                style={[m.saveBtn, saving && m.saveBtnDisabled]}
                onPress={() => saveAndExit(false)}
                disabled={saving}
              >
                <Text style={m.saveBtnText}>{saving ? 'Saving…' : 'Save notes'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status strip */}
      <View style={s.statusStrip}>
        <View style={s.liveDot} />
        <Text style={s.liveLabel}>SEIZURE TRACKING · LIVE</Text>
        <View style={{ flex: 1 }} />
        <Text style={s.notifiedLabel}>Contacts notified</Text>
      </View>

      {/* ── Video reminder banner ─────────────────────────────────────────── */}
      {videoReminderVisible && (
        <Pressable style={s.videoReminder} onPress={() => setVideoReminderVisible(false)}>
          <Text style={s.videoReminderIcon}>📹</Text>
          <View style={s.videoReminderText}>
            <Text style={s.videoReminderTitle}>Record if it's safe to do so</Text>
            <Text style={s.videoReminderSub}>A short video helps your neurologist see the seizure type. Tap to dismiss.</Text>
          </View>
          <Ionicons name="close" size={16} color={STEADY.ink.onDarkSec} />
        </Pressable>
      )}

      {/* Ring timer */}
      <View style={s.ringArea}>
        <View style={[s.ringCircle, { borderColor: past5 ? STEADY.emergency.base : STEADY.warn.base }]}>
          <Text style={[s.timerEyebrow, past5 && s.timerEyebrowDanger]}>ELAPSED</Text>
          <Text style={[s.timerValue, past5 && s.timerValueDanger]}>
            {mm}:{ss}
          </Text>
          <Text style={[s.timerHint, past5 && s.timerHintDanger]}>
            {past5 ? 'CALL 911 NOW' : seconds >= 180 ? 'Call 911 if not stopping' : 'Timing seizure'}
          </Text>
        </View>
      </View>

      {/* First-aid card */}
      <View style={s.aidCard}>
        <Text style={s.aidEyebrow}>
          STEP {aidStep + 1} OF {AID_STEPS.length} · First aid
        </Text>
        <Text style={s.aidTitle}>{step.title}</Text>
        <Text style={s.aidBody}>{step.desc}</Text>
        <View style={s.aidProgress}>
          {AID_STEPS.map((_, i) => (
            <View key={i} style={[s.aidStep, i <= aidStep && s.aidStepActive]} />
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={s.actionBar}>
        {past5 && (
          <Pressable style={s.call911Btn}>
            <Text style={s.call911Text}>📞 Call 911 immediately</Text>
          </Pressable>
        )}
        <View style={s.actionRow}>
          <Pressable
            style={s.noteBtn}
            onPress={() => {
              Alert.prompt(
                'Quick note',
                'Add a note about what you observe right now.',
                (text) => { if (text?.trim()) setNotes((prev) => prev ? `${prev} / ${text.trim()}` : text.trim()) },
                'plain-text',
                notes,
              )
            }}
          >
            <Ionicons name="mic-outline" size={16} color={STEADY.ink.onDark} />
            <Text style={s.noteBtnText}>Note</Text>
          </Pressable>
          <Pressable
            style={[s.endBtn, ending && s.endBtnDisabled]}
            onPress={handleEnd}
            disabled={ending}
          >
            <Ionicons name="stop-outline" size={16} color="#fff" />
            <Text style={s.endBtnText}>{saving ? 'Saving…' : 'Seizure ended'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

// ── Main screen styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: STEADY.bg.dark },
  rootDanger:         { backgroundColor: '#180808' },
  statusStrip:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 8 },
  liveDot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: STEADY.emergency.base },
  liveLabel:          { fontSize: 11, fontWeight: '700', color: STEADY.emergency.base, letterSpacing: 1.4 },
  notifiedLabel:      { fontSize: 11, color: STEADY.ink.onDarkSec },
  videoReminder:      {
    marginHorizontal: 16, marginTop: 10, marginBottom: 2,
    padding: 12, borderRadius: STEADY.r.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  videoReminderIcon:  { fontSize: 22 },
  videoReminderText:  { flex: 1 },
  videoReminderTitle: { fontSize: 13, fontWeight: '600', color: STEADY.ink.onDark },
  videoReminderSub:   { fontSize: 11, color: STEADY.ink.onDarkSec, marginTop: 2, lineHeight: 16 },
  ringArea:           { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  ringCircle:         {
    width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
    borderWidth: 6,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  timerEyebrow:       { fontSize: 11, fontWeight: '700', color: STEADY.ink.onDarkSec, letterSpacing: 1.6 },
  timerEyebrowDanger: { color: STEADY.emergency.base },
  timerValue:         { fontSize: 72, fontWeight: '200', letterSpacing: -2, color: STEADY.ink.onDark, lineHeight: 76 },
  timerValueDanger:   { color: STEADY.emergency.soft },
  timerHint:          { fontSize: 13, color: STEADY.ink.onDarkSec, marginTop: 6, fontWeight: '600' },
  timerHintDanger:    { color: STEADY.emergency.base },
  aidCard:            { marginHorizontal: 20, padding: 14, borderRadius: STEADY.r.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: STEADY.border.dark },
  aidEyebrow:         { fontSize: 10, fontWeight: '700', color: STEADY.accent.soft, letterSpacing: 1.4, marginBottom: 6 },
  aidTitle:           { fontSize: 17, fontWeight: '600', lineHeight: 22, color: STEADY.ink.onDark },
  aidBody:            { fontSize: 13, color: STEADY.ink.onDarkSec, marginTop: 4, lineHeight: 19 },
  aidProgress:        { flexDirection: 'row', gap: 4, marginTop: 12 },
  aidStep:            { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  aidStepActive:      { backgroundColor: STEADY.accent.base },
  actionBar:          { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 10 },
  call911Btn:         {
    height: 60, borderRadius: STEADY.r.lg,
    backgroundColor: STEADY.emergency.base,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: STEADY.emergency.base, shadowOpacity: 0.45,
    shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  call911Text:        { fontSize: 18, fontWeight: '700', color: '#fff' },
  actionRow:          { flexDirection: 'row', gap: 10 },
  noteBtn:            { flex: 1, height: 56, borderRadius: STEADY.r.lg, borderWidth: 1.5, borderColor: STEADY.border.dark, backgroundColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  noteBtnText:        { fontSize: 14, fontWeight: '600', color: STEADY.ink.onDark },
  endBtn:             { flex: 2, height: 56, borderRadius: STEADY.r.lg, backgroundColor: STEADY.accent.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  endBtnDisabled:     { opacity: 0.6 },
  endBtnText:         { fontSize: 16, fontWeight: '700', color: '#fff' },
})

// ── Post-seizure notes modal styles ──────────────────────────────────────────
const m = StyleSheet.create({
  overlay:              { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:                {
    backgroundColor: STEADY.bg.light, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%', alignItems: 'flex-start',
  },
  title:                { fontSize: 22, fontWeight: '700', color: STEADY.ink.primary, marginBottom: 4 },
  sub:                  { fontSize: 13, color: STEADY.ink.secondary, marginBottom: 20, lineHeight: 19 },
  sectionLabel:         { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: STEADY.ink.tertiary, marginBottom: 10, marginTop: 4 },
  typeGrid:             { width: '100%', gap: 8, marginBottom: 20 },
  typeCard:             { padding: 12, borderRadius: STEADY.r.md, borderWidth: 1, borderColor: STEADY.border.light, backgroundColor: '#fff' },
  typeCardSelected:     { borderColor: STEADY.accent.base, backgroundColor: STEADY.accent.soft },
  typeCardLabel:        { fontSize: 14, fontWeight: '600', color: STEADY.ink.primary },
  typeCardLabelSelected:{ color: STEADY.accent.deep },
  typeCardDesc:         { fontSize: 11, color: STEADY.ink.tertiary, marginTop: 2 },
  triggerGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  triggerChip:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: STEADY.r.pill, borderWidth: 1, borderColor: STEADY.border.light, backgroundColor: '#fff' },
  triggerChipSelected:  { borderColor: STEADY.accent.base, backgroundColor: STEADY.accent.soft },
  triggerEmoji:         { fontSize: 14 },
  triggerLabel:         { fontSize: 12, fontWeight: '500', color: STEADY.ink.secondary },
  triggerLabelSelected: { color: STEADY.accent.deep },
  yesNoRow:             { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  yesNoQuestion:        { fontSize: 14, fontWeight: '500', color: STEADY.ink.primary },
  yesNoBtns:            { flexDirection: 'row', gap: 8 },
  yesNoBtn:             { paddingHorizontal: 18, paddingVertical: 8, borderRadius: STEADY.r.pill, borderWidth: 1, borderColor: STEADY.border.light, backgroundColor: '#fff' },
  yesNoBtnYes:          { borderColor: STEADY.emergency.base, backgroundColor: STEADY.emergency.soft },
  yesNoBtnNo:           { borderColor: STEADY.accent.base, backgroundColor: STEADY.accent.soft },
  yesNoBtnText:         { fontSize: 13, fontWeight: '600', color: STEADY.ink.secondary },
  yesNoBtnTextActive:   { color: STEADY.ink.primary },
  stepperRow:           { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  stepperLabel:         { fontSize: 15, fontWeight: '600', color: STEADY.ink.primary },
  stepperBtns:          { flexDirection: 'row', gap: 8 },
  stepperBtn:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: STEADY.r.pill, borderWidth: 1, borderColor: STEADY.accent.base, backgroundColor: STEADY.accent.soft },
  stepperBtnText:       { fontSize: 13, fontWeight: '700', color: STEADY.accent.deep },
  stepperHint:          { fontSize: 11, color: STEADY.ink.tertiary, marginBottom: 4, lineHeight: 16 },
  notesInput:           {
    width: '100%', borderWidth: 1, borderColor: STEADY.border.light,
    borderRadius: STEADY.r.md, padding: 12, fontSize: 14,
    color: STEADY.ink.primary, backgroundColor: '#fff',
    minHeight: 80, textAlignVertical: 'top',
  },
  actions:              { flexDirection: 'row', gap: 10, paddingTop: 16, width: '100%' },
  skipBtn:              { flex: 1, height: 50, borderRadius: STEADY.r.lg, borderWidth: 1, borderColor: STEADY.border.light, alignItems: 'center', justifyContent: 'center' },
  skipBtnText:          { fontSize: 13, color: STEADY.ink.secondary },
  saveBtn:              { flex: 2, height: 50, borderRadius: STEADY.r.lg, backgroundColor: STEADY.accent.base, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled:      { opacity: 0.6 },
  saveBtnText:          { fontSize: 15, fontWeight: '700', color: '#fff' },
})
