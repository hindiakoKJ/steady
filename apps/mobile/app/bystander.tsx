import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { STEADY } from '@repo/ui'

const STEPS = [
  {
    title: 'Stay calm and stay with them',
    desc: 'Do not leave the person alone. Speak to them calmly.',
  },
  {
    title: 'Roll them onto their left side',
    desc: 'This recovery position keeps the airway clear. Put something soft under their head.',
  },
  {
    title: 'Time the seizure',
    desc: 'Note when it started. Call 911 if it goes past 5 minutes.',
  },
  {
    title: 'Clear the area',
    desc: 'Move hard or sharp objects away from them. Do not restrain them.',
  },
  {
    title: 'Do NOT put anything in their mouth',
    desc: 'They cannot swallow their tongue. You could cause injury.',
  },
  {
    title: 'Stay until they are fully alert',
    desc: 'After the seizure, they may be confused. Speak calmly and reassure them.',
  },
]

export default function BystanderMode() {
  const router = useRouter()

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Alert banner */}
        <View style={s.detectBanner}>
          <View style={s.detectDot} />
          <Text style={s.detectLabel}>Medical alert — please help</Text>
        </View>

        {/* Identity */}
        <View style={s.identityBlock}>
          <Text style={s.alertEyebrow}>SEIZURE IN PROGRESS</Text>
          <Text style={s.identityCondition}>
            This person has <Text style={s.identityBold}>epilepsy</Text> and may lose awareness during a seizure.
            They are not in immediate danger if you follow these steps.
          </Text>
        </View>

        {/* First-aid steps */}
        <View style={s.aidCard}>
          <Text style={s.aidEyebrow}>WHAT TO DO RIGHT NOW</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={[s.aidStep, i > 0 && s.aidStepDivider]}>
              <View style={s.aidStepNum}>
                <Text style={s.aidStepNumText}>{i + 1}</Text>
              </View>
              <View style={s.aidStepBody}>
                <Text style={s.aidStepTitle}>{step.title}</Text>
                <Text style={s.aidStepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Do NOT box */}
        <View style={s.doNotCard}>
          <Text style={s.doNotEyebrow}>DO NOT</Text>
          {['Hold them down or restrain them', 'Put anything in their mouth', 'Give water or medicine during the seizure', 'Leave them alone'].map((item, i) => (
            <Text key={i} style={s.doNotItem}>✗  {item}</Text>
          ))}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={s.actionStack}>
        <Pressable style={s.call911Btn} onPress={() => Linking.openURL('tel:911')}>
          <Ionicons name="call-outline" size={20} color="#fff" />
          <Text style={s.call911Text}>Call 911</Text>
        </Pressable>
        <Pressable style={s.familyBtn} onPress={() => router.back()}>
          <Text style={s.familyBtnText}>I am their family — go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: STEADY.bg.dark },
  content:            { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  detectBanner:       {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: STEADY.r.md,
    backgroundColor: STEADY.emergency.softDark, borderWidth: 1, borderColor: STEADY.emergency.deep,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
  },
  detectDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: STEADY.emergency.base },
  detectLabel:        { fontSize: 13, fontWeight: '600', color: STEADY.ink.onDark },
  identityBlock:      { marginBottom: 20 },
  alertEyebrow:       { fontSize: 11, fontWeight: '700', color: STEADY.emergency.base, letterSpacing: 1.4, marginBottom: 8 },
  identityCondition:  { fontSize: 16, color: STEADY.ink.onDarkSec, lineHeight: 24 },
  identityBold:       { color: STEADY.ink.onDark, fontWeight: '600' },
  aidCard:            { padding: 16, borderRadius: STEADY.r.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: STEADY.border.dark, marginBottom: 14 },
  aidEyebrow:         { fontSize: 11, fontWeight: '700', color: STEADY.accent.soft, letterSpacing: 1.2, marginBottom: 12 },
  aidStep:            { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10 },
  aidStepDivider:     { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: STEADY.border.dark },
  aidStepNum:         { width: 22, height: 22, borderRadius: 11, backgroundColor: STEADY.accent.base, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  aidStepNumText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
  aidStepBody:        { flex: 1 },
  aidStepTitle:       { fontSize: 15, fontWeight: '600', color: STEADY.ink.onDark },
  aidStepDesc:        { fontSize: 13, color: STEADY.ink.onDarkSec, marginTop: 2, lineHeight: 19 },
  doNotCard:          { padding: 14, borderRadius: STEADY.r.md, backgroundColor: STEADY.emergency.softDark, borderWidth: 1, borderColor: STEADY.emergency.deep, gap: 8 },
  doNotEyebrow:       { fontSize: 11, fontWeight: '700', color: STEADY.emergency.base, letterSpacing: 1.2 },
  doNotItem:          { fontSize: 14, color: STEADY.ink.onDark, lineHeight: 20 },
  actionStack:        { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 10, backgroundColor: STEADY.bg.dark },
  call911Btn:         {
    height: 64, borderRadius: STEADY.r.lg,
    backgroundColor: STEADY.emergency.base,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: STEADY.emergency.base, shadowOpacity: 0.45,
    shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  call911Text:        { fontSize: 18, fontWeight: '700', color: '#fff' },
  familyBtn:          { height: 54, borderRadius: STEADY.r.lg, borderWidth: 1.5, borderColor: STEADY.border.dark, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  familyBtnText:      { fontSize: 15, fontWeight: '600', color: STEADY.ink.onDark },
})
