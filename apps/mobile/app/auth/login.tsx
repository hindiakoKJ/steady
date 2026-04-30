import { useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { STEADY } from '@repo/ui'
import { Field } from '@/components/Field'
import { SteadyMark } from '@/components/SteadyMark'
import { authApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.login({ email: email.trim().toLowerCase(), password })
      await authStorage.saveSession(
        res.token,
        res.householdId,
        res.patientId ?? '',
        res.patientNickname ?? 'My Loved One',
      )
      router.replace('/(tabs)')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid email or password.'
      Alert.alert('Sign in failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <SteadyMark size={64} />
            <Text style={s.title}>Welcome back</Text>
            <Text style={s.subtitle}>Sign in to access your seizure log and keep your family safe.</Text>
          </View>

          <View style={s.fieldStack}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              type="email"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              type="password"
              placeholder="Your password"
            />
            <View style={s.forgotRow}>
              <Text style={s.forgotLink}>Forgot password?</Text>
            </View>
          </View>

          <Pressable
            style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </Pressable>

          <Pressable style={s.emergencyCard} onPress={() => router.push('/bystander')}>
            <View style={s.emergencyIcon}>
              <Ionicons name="call-outline" size={16} color="#fff" />
            </View>
            <View style={s.emergencyText}>
              <Text style={s.emergencyTitle}>Emergency without sign-in</Text>
              <Text style={s.emergencyHint}>Open first-aid guide for bystanders</Text>
            </View>
          </Pressable>

          <View style={s.spacer} />

          <Pressable onPress={() => router.push('/auth/register')}>
            <Text style={s.footerText}>
              New to Steady?{' '}
              <Text style={s.footerLink}>Create a free account</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: STEADY.bg.dark },
  kav:                { flex: 1 },
  content:            { flexGrow: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40 },
  header:             { marginTop: 40, marginBottom: 36 },
  title:              { fontSize: 34, fontWeight: '700', letterSpacing: -0.6, marginTop: 18, color: STEADY.ink.onDark },
  subtitle:           { fontSize: 15, color: STEADY.ink.onDarkSec, marginTop: 6, lineHeight: 22 },
  fieldStack:         { gap: 14 },
  forgotRow:          { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  forgotLink:         { fontSize: 14, color: STEADY.accent.soft },
  primaryBtn:         {
    marginTop: 28, height: 56, borderRadius: STEADY.r.lg,
    backgroundColor: STEADY.accent.base, alignItems: 'center', justifyContent: 'center',
    shadowColor: STEADY.accent.base, shadowOpacity: 0.3, shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText:     { color: '#fff', fontSize: 17, fontWeight: '600' },
  emergencyCard:      {
    marginTop: 16, padding: 14, borderRadius: STEADY.r.md,
    backgroundColor: STEADY.emergency.softDark, borderWidth: 1,
    borderColor: STEADY.emergency.deep, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  emergencyIcon:      { width: 36, height: 36, borderRadius: 18, backgroundColor: STEADY.emergency.base, alignItems: 'center', justifyContent: 'center' },
  emergencyText:      { flex: 1 },
  emergencyTitle:     { fontSize: 14, fontWeight: '600', color: STEADY.ink.onDark },
  emergencyHint:      { fontSize: 12, color: STEADY.ink.onDarkSec, marginTop: 1 },
  spacer:             { flex: 1, minHeight: 32 },
  footerText:         { textAlign: 'center', fontSize: 14, color: STEADY.ink.onDarkSec, paddingVertical: 8 },
  footerLink:         { color: STEADY.accent.soft, fontWeight: '600' },
})
