import { useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, Check, User, Heart } from 'lucide-react-native'
import { STEADY } from '@repo/ui'
import { Field } from '@/components/Field'
import { authApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'

export default function RegisterScreen() {
  const router = useRouter()
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [householdAlias, setHouseholdAlias] = useState('')
  const [patientNickname, setPatientNickname] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!email.trim() || !password || !householdAlias.trim() || !patientNickname.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.')
      return
    }
    if (!agreed) {
      Alert.alert('Terms required', 'Please agree to the terms to continue.')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.register({
        email: email.trim().toLowerCase(),
        password,
        householdAlias: householdAlias.trim(),
        patientNickname: patientNickname.trim(),
      })
      await authStorage.saveSession(res.token, res.householdId, res.patientId, res.patientNickname)
      router.replace('/(tabs)')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not create account. Please try again.'
      Alert.alert('Registration failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.progressRow}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={18} color={STEADY.ink.onDarkSec} />
        </Pressable>
        <View style={s.progressTrack}>
          <View style={s.progressFill} />
        </View>
        <Text style={s.progressLabel}>1 / 1</Text>
      </View>

      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.privacyCard}>
            <Text style={s.privacyEyebrow}>Our Privacy Promise</Text>
            <Text style={s.privacyText}>
              "We don't sell your sickness. We don't track your identity.
              We only track what helps you stay safe."
            </Text>
            <View style={s.privacyPoints}>
              <Text style={s.privacyPoint}>✓ No full name required — use a nickname</Text>
              <Text style={s.privacyPoint}>✓ No phone number required to sign up</Text>
              <Text style={s.privacyPoint}>✓ 100% free. Always.</Text>
            </View>
          </View>

          <Text style={s.title}>Create your account</Text>
          <Text style={s.subtitle}>Nickname only — no legal name needed.</Text>

          <View style={s.roleRow}>
            <Pressable
              style={[s.roleCard, role === 'patient' && s.roleCardActive]}
              onPress={() => setRole('patient')}
            >
              <Heart size={20} color={role === 'patient' ? STEADY.accent.soft : STEADY.ink.onDarkTer} />
              <Text style={role === 'patient' ? s.roleLabelActive : s.roleLabel}>I have epilepsy</Text>
            </Pressable>
            <Pressable
              style={[s.roleCard, role === 'caregiver' && s.roleCardActive]}
              onPress={() => setRole('caregiver')}
            >
              <User size={20} color={role === 'caregiver' ? STEADY.accent.soft : STEADY.ink.onDarkTer} />
              <Text style={role === 'caregiver' ? s.roleLabelActive : s.roleLabel}>I'm a caregiver</Text>
            </Pressable>
          </View>

          <View style={s.fieldStack}>
            <Field label="Email" value={email} onChangeText={setEmail} type="email" placeholder="you@example.com" />
            <Field label="Password" value={password} onChangeText={setPassword} type="password" placeholder="8+ characters" />
            <Field
              label="Family nickname"
              value={householdAlias}
              onChangeText={setHouseholdAlias}
              placeholder='"The Cruz Family"'
              autoCapitalize="words"
            />
            <Field
              label={role === 'patient' ? 'Your nickname' : 'Patient nickname'}
              value={patientNickname}
              onChangeText={setPatientNickname}
              placeholder='"Ate Mia" or "Kuya Ben"'
              autoCapitalize="words"
            />
            <Text style={s.hint}>A nickname is all we need — no full legal name.</Text>
          </View>

          <Pressable style={s.consentRow} onPress={() => setAgreed(!agreed)}>
            <View style={[s.checkbox, agreed && s.checkboxChecked]}>
              {agreed && <Check size={13} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={s.consentText}>
              I agree to the{' '}
              <Text style={s.consentLink}>Terms of Service</Text>
              {' '}and understand this app does not replace medical advice.
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.ctaBar}>
        <Pressable
          style={[s.continueBtn, loading && s.continueBtnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={s.continueBtnText}>{loading ? 'Creating account…' : 'Create account'}</Text>
          {!loading && <ChevronRight size={18} color="#fff" />}
        </Pressable>
        <Pressable onPress={() => router.push('/auth/login')}>
          <Text style={s.signinLink}>
            Already have an account?{' '}
            <Text style={s.signinLinkAccent}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: STEADY.bg.dark },
  kav:                { flex: 1 },
  progressRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 14 },
  backBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  progressTrack:      { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill:       { width: '100%', height: '100%', backgroundColor: STEADY.accent.base },
  progressLabel:      { fontSize: 13, color: STEADY.ink.onDarkSec },
  scrollContent:      { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 20 },
  privacyCard:        {
    padding: 16, borderRadius: STEADY.r.lg, borderWidth: 1,
    borderColor: STEADY.accent.softDark, backgroundColor: 'rgba(46,125,122,0.08)', marginBottom: 24,
  },
  privacyEyebrow:     { fontSize: 11, fontWeight: '700', color: STEADY.accent.soft, letterSpacing: 1.2, marginBottom: 6 },
  privacyText:        { fontSize: 13, color: STEADY.ink.onDarkSec, fontStyle: 'italic', lineHeight: 19, marginBottom: 10 },
  privacyPoints:      { gap: 4 },
  privacyPoint:       { fontSize: 12, color: STEADY.accent.soft, fontWeight: '500' },
  title:              { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: STEADY.ink.onDark, marginBottom: 6 },
  subtitle:           { fontSize: 14, color: STEADY.ink.onDarkSec, marginBottom: 20, lineHeight: 20 },
  roleRow:            { flexDirection: 'row', gap: 10, marginBottom: 22 },
  roleCard:           { flex: 1, paddingHorizontal: 12, paddingVertical: 14, borderRadius: STEADY.r.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: STEADY.border.dark, gap: 8, alignItems: 'center' },
  roleCardActive:     { backgroundColor: STEADY.accent.softDark, borderColor: STEADY.accent.base },
  roleLabel:          { fontSize: 13, fontWeight: '600', color: STEADY.ink.onDarkTer, textAlign: 'center' },
  roleLabelActive:    { fontSize: 13, fontWeight: '600', color: STEADY.ink.onDark, textAlign: 'center' },
  fieldStack:         { gap: 14, marginBottom: 18 },
  hint:               { fontSize: 12, color: STEADY.ink.onDarkTer },
  consentRow:         { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
  checkbox:           { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: STEADY.border.dark, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked:    { backgroundColor: STEADY.accent.base, borderColor: STEADY.accent.base },
  consentText:        { flex: 1, fontSize: 13, color: STEADY.ink.onDarkSec, lineHeight: 19 },
  consentLink:        { color: STEADY.accent.soft, textDecorationLine: 'underline' },
  ctaBar:             { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, gap: 14 },
  continueBtn:        { height: 56, borderRadius: STEADY.r.lg, backgroundColor: STEADY.accent.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  continueBtnDisabled:{ opacity: 0.6 },
  continueBtnText:    { color: '#fff', fontSize: 17, fontWeight: '600' },
  signinLink:         { textAlign: 'center', fontSize: 14, color: STEADY.ink.onDarkSec },
  signinLinkAccent:   { color: STEADY.accent.soft, fontWeight: '600' },
})
