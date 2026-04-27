import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { Mic, Square } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STEADY } from '@repo/ui'
import { seizureLogsApi } from '@/lib/api'

const RING_SIZE = 280
const STROKE = 8
const RADIUS = (RING_SIZE - STROKE * 2) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const MAX_RING_SECONDS = 300 // 5 minutes fills the ring

const AID_STEPS = [
  { title: 'Stay calm and stay with them', desc: 'Do not leave the person alone.' },
  { title: 'Roll them onto their left side', desc: 'This keeps the airway clear and safe.' },
  { title: 'Clear the area around them', desc: 'Move hard or sharp objects away.' },
  { title: 'Do NOT put anything in their mouth', desc: 'They cannot swallow their tongue.' },
]

export default function SeizureActive() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(0)
  const [ending, setEnding] = useState(false)
  const [aidStep, setAidStep] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Advance first-aid step every 30 seconds
  useEffect(() => {
    if (seconds > 0 && seconds % 30 === 0 && aidStep < AID_STEPS.length - 1) {
      setAidStep((s) => s + 1)
    }
  }, [seconds])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const past5 = seconds >= 300

  // Ring progress: fills from 0 → 300s then stays full
  const progress = Math.min(seconds / MAX_RING_SECONDS, 1)
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  const handleEnd = async () => {
    if (ending) return
    setEnding(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
    try {
      const id = await AsyncStorage.getItem('@steady/activeSeizureLogId')
      if (id) {
        await seizureLogsApi.end(id, { endedAt: new Date().toISOString() })
        await AsyncStorage.removeItem('@steady/activeSeizureLogId')
      }
      router.back()
    } catch {
      Alert.alert('Error', 'Could not save seizure end. Please try again.')
      setEnding(false)
    }
  }

  const step = AID_STEPS[aidStep]

  return (
    <SafeAreaView style={[s.root, past5 && s.rootDanger]}>
      {/* Status strip */}
      <View style={s.statusStrip}>
        <View style={s.liveDot} />
        <Text style={s.liveLabel}>SEIZURE TRACKING · LIVE</Text>
        <View style={{ flex: 1 }} />
        <Text style={s.notifiedLabel}>Contacts notified</Text>
      </View>

      {/* Ring timer */}
      <View style={s.ringArea}>
        <Svg
          width={RING_SIZE}
          height={RING_SIZE}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          {/* Track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Progress */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={past5 ? STEADY.emergency.base : STEADY.warn.base}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
          />
        </Svg>

        {/* Timer overlay */}
        <View style={s.timerCenter}>
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
          <Pressable style={s.noteBtn}>
            <Mic size={16} color={STEADY.ink.onDark} />
            <Text style={s.noteBtnText}>Note</Text>
          </Pressable>
          <Pressable
            style={[s.endBtn, ending && s.endBtnDisabled]}
            onPress={handleEnd}
            disabled={ending}
          >
            <Square size={16} color="#fff" fill="#fff" />
            <Text style={s.endBtnText}>{ending ? 'Saving…' : 'Seizure ended'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: STEADY.bg.dark },
  rootDanger:         { backgroundColor: '#180808' },
  statusStrip:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 8 },
  liveDot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: STEADY.emergency.base },
  liveLabel:          { fontSize: 11, fontWeight: '700', color: STEADY.emergency.base, letterSpacing: 1.4 },
  notifiedLabel:      { fontSize: 11, color: STEADY.ink.onDarkSec },
  ringArea:           { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  timerCenter:        {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center',
    top: 16,
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
