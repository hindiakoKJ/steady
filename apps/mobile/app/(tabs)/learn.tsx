import { useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { STEADY } from '@repo/ui'

// ─── Seizure type data ────────────────────────────────────────────────────────

const SEIZURE_TYPES = [
  {
    id: 'tonic-clonic',
    name: 'Tonic-Clonic',
    aka: 'Grand Mal',
    emoji: '⚡',
    color: '#C8312B',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    tagline: 'Full body stiffening and jerking',
    description:
      'The body goes rigid (tonic phase), then rhythmic jerking begins (clonic phase). The person loses consciousness and may fall. After the seizure, they are often confused, exhausted, and may sleep for hours.',
    duration: '1–3 minutes typical. Emergency if over 5 minutes.',
    consciousness: 'Lost — person is completely unaware',
    awareness: 'none',
    common_in: 'Any age. Can occur at any time.',
    do: [
      'Time the seizure from the first movement',
      'Cushion their head with something soft',
      'Roll them onto their left side after convulsions stop',
      'Stay with them until fully recovered',
      'Call 911 if it lasts over 5 minutes',
    ],
    dont: [
      'Do NOT hold them down or restrain movement',
      'Do NOT put anything in their mouth',
      'Do NOT give water until fully awake',
      'Do NOT leave them alone',
    ],
  },
  {
    id: 'absence',
    name: 'Absence',
    aka: 'Petit Mal',
    emoji: '🌫️',
    color: '#D88820',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    tagline: 'Brief staring, "switches off" momentarily',
    description:
      'The person suddenly stops what they are doing and stares blankly. They may blink rapidly, chew, or make small repetitive movements. It ends as suddenly as it started. The person usually has no memory of it.',
    duration: '5–30 seconds. Rarely longer.',
    consciousness: 'Briefly lost — unresponsive during episode',
    awareness: 'none',
    common_in: 'Most common in children aged 4–14. May occur dozens of times per day.',
    do: [
      'Stay calm — it ends on its own',
      'Note the time and how long it lasted',
      'Gently guide them away from danger if needed',
      'Speak calmly when they come back',
      'Track frequency — tell the neurologist',
    ],
    dont: [
      'Do NOT shout at them or shake them',
      'Do NOT try to "snap them out of it"',
      'Do NOT leave them near stairs, water, or traffic',
    ],
  },
  {
    id: 'focal',
    name: 'Focal',
    aka: 'Partial Seizure',
    emoji: '🔦',
    color: '#2E7D7A',
    bgColor: '#F0F9F8',
    borderColor: '#B2D8D6',
    tagline: 'One area of the body or brain affected',
    description:
      'Affects only one part of the brain. May cause unusual sensations, emotions, jerking in one limb, or automatisms (repeated movements like lip-smacking or hand-rubbing). The person may be aware (focal aware) or confused (focal impaired awareness).',
    duration: '1–2 minutes. May spread to a full tonic-clonic.',
    consciousness: 'May be aware or confused — varies by type',
    awareness: 'partial',
    common_in: 'Any age. Often related to a specific brain region.',
    do: [
      'Stay nearby and speak calmly',
      'Guide them away from danger gently',
      'Note what body part was affected',
      'Time the seizure',
      'Wait for full recovery before leaving',
    ],
    dont: [
      'Do NOT restrain their movements',
      'Do NOT put anything in their mouth',
      'Do NOT startle them — approach gently',
    ],
  },
  {
    id: 'myoclonic',
    name: 'Myoclonic',
    aka: 'Muscle Jerks',
    emoji: '⚡',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    tagline: 'Sudden brief muscle jerks, like being startled',
    description:
      'Short, shock-like jerks of a muscle or group of muscles. Often affects the arms, shoulders, or whole body. The person is usually awake and aware. Jerks frequently occur in clusters, especially in the morning shortly after waking.',
    duration: 'Fractions of a second. May cluster over minutes.',
    consciousness: 'Usually maintained — person is awake',
    awareness: 'full',
    common_in: 'Often part of juvenile myoclonic epilepsy (JME). Peak onset in teens.',
    do: [
      'Note the time — especially if it happens after waking',
      'Ensure they are seated or away from hot surfaces',
      'Record frequency and pattern for the neurologist',
      'Check for triggers: sleep deprivation, alcohol, flashing lights',
    ],
    dont: [
      'Do NOT panic — single jerks are very brief',
      'Do NOT dismiss repeated morning jerks — tell the neurologist',
    ],
  },
  {
    id: 'atonic',
    name: 'Atonic',
    aka: 'Drop Attack',
    emoji: '💧',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    tagline: 'Sudden loss of muscle tone — person drops',
    description:
      'Muscles suddenly go limp. The person may drop their head, slump in a chair, or fall to the ground suddenly. Falls can cause head injuries. The episode is very brief and the person recovers quickly.',
    duration: 'Seconds. Recovery is rapid.',
    consciousness: 'Brief loss during the drop',
    awareness: 'none',
    common_in: 'Less common. Often associated with Lennox-Gastaut syndrome.',
    do: [
      'Check for head or face injuries after a fall',
      'Helmet use may be recommended by the neurologist',
      'Help them to a safe seated position',
      'Log every drop — frequency matters',
    ],
    dont: [
      'Do NOT try to catch them by grabbing their arms forcefully',
      'Do NOT dismiss frequent drops — they require medical review',
    ],
  },
]

const FIRST_AID_STEPS = [
  { emoji: '⏱️', title: 'Time it', desc: 'Start timing from the first movement. Tell the neurologist exactly how long it lasted.' },
  { emoji: '🛡️', title: 'Protect', desc: 'Cushion their head. Remove glasses. Loosen tight clothing. Move sharp objects away.' },
  { emoji: '🔄', title: 'Position', desc: 'After convulsions stop, roll them onto their left side (recovery position) to keep airway clear.' },
  { emoji: '🚫', title: 'Never restrain', desc: 'Do NOT hold them down. Do NOT put anything in their mouth. They cannot swallow their tongue.' },
  { emoji: '📞', title: 'Call 911 if…', desc: 'Seizure lasts over 5 minutes · Person does not wake up · Second seizure follows · They are injured · First-ever seizure.' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function LearnScreen() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<'types' | 'firstaid'>('types')

  return (
    <SafeAreaView style={s.root}>
      <View style={s.headerRow}>
        <Text style={s.eyebrow}>Reference guide</Text>
        <Text style={s.title}>Learn</Text>
      </View>

      {/* Tab switcher */}
      <View style={s.tabRow}>
        <Pressable
          style={[s.tabBtn, tab === 'types' && s.tabBtnActive]}
          onPress={() => setTab('types')}
        >
          <Text style={[s.tabBtnText, tab === 'types' && s.tabBtnTextActive]}>Seizure Types</Text>
        </Pressable>
        <Pressable
          style={[s.tabBtn, tab === 'firstaid' && s.tabBtnActive]}
          onPress={() => setTab('firstaid')}
        >
          <Text style={[s.tabBtnText, tab === 'firstaid' && s.tabBtnTextActive]}>First Aid</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'types' ? (
          <>
            <Text style={s.intro}>
              Tap any seizure type to learn what it looks like, how long it lasts, and what to do.
            </Text>
            {SEIZURE_TYPES.map((type) => {
              const isOpen = expanded === type.id
              return (
                <Pressable
                  key={type.id}
                  style={[s.card, { borderColor: isOpen ? type.color : type.borderColor, backgroundColor: isOpen ? type.bgColor : '#fff' }]}
                  onPress={() => setExpanded(isOpen ? null : type.id)}
                >
                  {/* Header row */}
                  <View style={s.cardHeader}>
                    <View style={[s.cardEmoji, { backgroundColor: type.bgColor }]}>
                      <Text style={s.cardEmojiText}>{type.emoji}</Text>
                    </View>
                    <View style={s.cardHeaderText}>
                      <View style={s.cardTitleRow}>
                        <Text style={[s.cardName, { color: type.color }]}>{type.name}</Text>
                        <Text style={s.cardAka}>{type.aka}</Text>
                      </View>
                      <Text style={s.cardTagline}>{type.tagline}</Text>
                    </View>
                    <Text style={[s.chevron, { color: type.color }]}>{isOpen ? '▲' : '▼'}</Text>
                  </View>

                  {/* Expanded content */}
                  {isOpen && (
                    <View style={s.cardBody}>
                      <Text style={s.cardDesc}>{type.description}</Text>

                      <View style={s.infoGrid}>
                        <View style={s.infoBox}>
                          <Text style={s.infoLabel}>⏱ DURATION</Text>
                          <Text style={s.infoValue}>{type.duration}</Text>
                        </View>
                        <View style={s.infoBox}>
                          <Text style={s.infoLabel}>🧠 CONSCIOUSNESS</Text>
                          <Text style={s.infoValue}>{type.consciousness}</Text>
                        </View>
                        <View style={[s.infoBox, { flex: 1, minWidth: '100%' }]}>
                          <Text style={s.infoLabel}>👥 COMMON IN</Text>
                          <Text style={s.infoValue}>{type.common_in}</Text>
                        </View>
                      </View>

                      <Text style={[s.listHeader, { color: '#16A34A' }]}>✅ DO</Text>
                      {type.do.map((item, i) => (
                        <Text key={i} style={s.listItem}>• {item}</Text>
                      ))}

                      <Text style={[s.listHeader, { color: '#C8312B', marginTop: 12 }]}>🚫 DO NOT</Text>
                      {type.dont.map((item, i) => (
                        <Text key={i} style={[s.listItem, { color: '#7F1D1D' }]}>• {item}</Text>
                      ))}
                    </View>
                  )}
                </Pressable>
              )
            })}
          </>
        ) : (
          <>
            <Text style={s.intro}>
              Follow these steps any time you witness a seizure, regardless of type.
            </Text>
            {FIRST_AID_STEPS.map((step, i) => (
              <View key={i} style={s.aidCard}>
                <View style={s.aidLeft}>
                  <Text style={s.aidEmoji}>{step.emoji}</Text>
                  <View style={i < FIRST_AID_STEPS.length - 1 ? s.aidLine : s.aidLineHidden} />
                </View>
                <View style={s.aidRight}>
                  <Text style={s.aidTitle}>{step.title}</Text>
                  <Text style={s.aidDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}

            {/* Emergency reminder */}
            <View style={s.emergencyCard}>
              <Text style={s.emergencyTitle}>📞 When to call 911</Text>
              <Text style={s.emergencyItem}>• Seizure lasts more than <Text style={s.bold}>5 minutes</Text></Text>
              <Text style={s.emergencyItem}>• Person does not regain consciousness</Text>
              <Text style={s.emergencyItem}>• A second seizure follows immediately</Text>
              <Text style={s.emergencyItem}>• Person is injured, pregnant, or in water</Text>
              <Text style={s.emergencyItem}>• It is their <Text style={s.bold}>first-ever seizure</Text></Text>
            </View>

            <View style={s.tipCard}>
              <Text style={s.tipTitle}>💊 After the seizure</Text>
              <Text style={s.tipDesc}>
                The postictal period (recovery) can last minutes to hours. The person may be confused,
                tired, or have a headache. Stay with them, speak calmly, and do not offer food or water
                until they are fully alert.
              </Text>
            </View>
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: STEADY.bg.light },
  headerRow:        { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  eyebrow:          { fontSize: 13, color: STEADY.ink.secondary },
  title:            { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: STEADY.ink.primary },
  tabRow:           { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
  tabBtn:           { flex: 1, paddingVertical: 9, borderRadius: STEADY.r.pill, borderWidth: 1, borderColor: STEADY.border.light, backgroundColor: '#fff', alignItems: 'center' },
  tabBtnActive:     { backgroundColor: STEADY.accent.base, borderColor: STEADY.accent.base },
  tabBtnText:       { fontSize: 13, fontWeight: '600', color: STEADY.ink.secondary },
  tabBtnTextActive: { color: '#fff' },
  scroll:           { paddingHorizontal: 16 },
  intro:            { fontSize: 13, color: STEADY.ink.secondary, lineHeight: 20, marginBottom: 14 },

  // Seizure type cards
  card:             { borderRadius: STEADY.r.lg, borderWidth: 1.5, marginBottom: 10, overflow: 'hidden' },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardEmoji:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardEmojiText:    { fontSize: 22 },
  cardHeaderText:   { flex: 1 },
  cardTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName:         { fontSize: 16, fontWeight: '700' },
  cardAka:          { fontSize: 11, color: STEADY.ink.tertiary, fontStyle: 'italic' },
  cardTagline:      { fontSize: 12, color: STEADY.ink.secondary, marginTop: 2 },
  chevron:          { fontSize: 11, fontWeight: '700' },
  cardBody:         { paddingHorizontal: 14, paddingBottom: 16, gap: 4 },
  cardDesc:         { fontSize: 14, color: STEADY.ink.primary, lineHeight: 21, marginBottom: 12 },
  infoGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  infoBox:          { flex: 1, minWidth: '45%', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: STEADY.r.md, padding: 10 },
  infoLabel:        { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: STEADY.ink.tertiary, marginBottom: 4 },
  infoValue:        { fontSize: 12, color: STEADY.ink.primary, lineHeight: 18 },
  listHeader:       { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  listItem:         { fontSize: 13, color: STEADY.ink.primary, lineHeight: 20, marginBottom: 2 },

  // First aid steps
  aidCard:          { flexDirection: 'row', gap: 14, marginBottom: 4 },
  aidLeft:          { alignItems: 'center', width: 40 },
  aidEmoji:         { fontSize: 24, lineHeight: 40, textAlign: 'center' },
  aidLine:          { width: 2, flex: 1, backgroundColor: STEADY.border.light, marginTop: 4, marginBottom: 4 },
  aidLineHidden:    { width: 2, flex: 1 },
  aidRight:         { flex: 1, paddingBottom: 20 },
  aidTitle:         { fontSize: 15, fontWeight: '700', color: STEADY.ink.primary, marginBottom: 4 },
  aidDesc:          { fontSize: 13, color: STEADY.ink.secondary, lineHeight: 20 },

  // Emergency + tip cards
  emergencyCard:    { backgroundColor: '#FEF2F2', borderRadius: STEADY.r.lg, borderWidth: 1, borderColor: '#FECACA', padding: 16, marginTop: 4, marginBottom: 12, gap: 6 },
  emergencyTitle:   { fontSize: 14, fontWeight: '700', color: '#C8312B', marginBottom: 4 },
  emergencyItem:    { fontSize: 13, color: '#7F1D1D', lineHeight: 20 },
  bold:             { fontWeight: '700' },
  tipCard:          { backgroundColor: STEADY.accent.soft, borderRadius: STEADY.r.lg, borderWidth: 1, borderColor: STEADY.accent.base, padding: 16, gap: 6 },
  tipTitle:         { fontSize: 14, fontWeight: '700', color: STEADY.accent.deep },
  tipDesc:          { fontSize: 13, color: STEADY.ink.primary, lineHeight: 20 },
})
