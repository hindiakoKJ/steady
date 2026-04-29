import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { STEADY } from '@repo/ui'
import { contactsApi } from '@/lib/api'
import type { EmergencyContact } from '@repo/types'

export default function ContactsScreen() {
  const router = useRouter()
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nickname, setNickname] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const load = async () => {
    try {
      const list = await contactsApi.list()
      setContacts(list)
    } catch {
      // silently ignore if API not yet connected
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!nickname.trim()) {
      Alert.alert('Nickname required', 'Enter a nickname for this contact.')
      return
    }
    setSaving(true)
    try {
      await contactsApi.create({
        nickname: nickname.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      })
      setNickname('')
      setPhoneNumber('')
      await load()
    } catch {
      Alert.alert('Error', 'Could not add contact. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (contact: EmergencyContact) => {
    Alert.alert(
      `Remove ${contact.nickname}?`,
      'They will no longer receive BEACON alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactsApi.delete(contact.id)
              setContacts((prev) => prev.filter((c) => c.id !== contact.id))
            } catch {
              Alert.alert('Error', 'Could not remove contact.')
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.eyebrow}>BEACON targets</Text>
          <Text style={s.title}>Emergency Contacts</Text>
        </View>
        <Pressable style={s.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close-outline" size={18} color={STEADY.ink.secondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy note */}
        <View style={s.privacyNote}>
          <Text style={s.privacyText}>
            Phone numbers are optional — contacts without one will receive push alerts when they have the app installed.
          </Text>
        </View>

        {/* Existing contacts */}
        {loading ? (
          <ActivityIndicator color={STEADY.accent.base} style={{ marginVertical: 24 }} />
        ) : contacts.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyTitle}>No contacts yet</Text>
            <Text style={s.emptySub}>Add someone below to receive BEACON SMS alerts when a seizure is logged.</Text>
          </View>
        ) : (
          <View style={s.contactList}>
            {contacts.map((c) => (
              <View key={c.id} style={s.contactCard}>
                <View style={s.contactAvatar}>
                  <Ionicons name="person-outline" size={16} color={STEADY.accent.base} />
                </View>
                <View style={s.contactInfo}>
                  <Text style={s.contactName}>{c.nickname}</Text>
                  {c.phoneNumber
                    ? <View style={s.phoneRow}>
                        <Ionicons name="call-outline" size={11} color={STEADY.ink.secondary} />
                        <Text style={s.contactPhone}>{c.phoneNumber}</Text>
                      </View>
                    : <Text style={s.contactPhoneMissing}>Push only — no phone number</Text>
                  }
                </View>
                <Pressable style={s.deleteBtn} onPress={() => handleDelete(c)} hitSlop={8}>
                  <Ionicons name="close-outline" size={15} color={STEADY.emergency.base} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Add contact form */}
        <View style={s.addCard}>
          <Text style={s.addCardTitle}>Add a contact</Text>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Nickname *</Text>
            <TextInput
              style={s.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder='"Dad", "Lola", "Kuya Jun"'
              placeholderTextColor={STEADY.ink.tertiary}
              autoCapitalize="words"
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Phone number (optional)</Text>
            <TextInput
              style={s.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+63 912 345 6789"
              placeholderTextColor={STEADY.ink.tertiary}
              keyboardType="phone-pad"
            />
            <Text style={s.fieldHint}>Required to receive BEACON SMS. Leave blank for push-only.</Text>
          </View>

          <Pressable
            style={[s.addBtn, saving && s.addBtnDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="add-outline" size={16} color="#fff" />
                  <Text style={s.addBtnText}>Add contact</Text>
                </>
            }
          </Pressable>
        </View>

        {/* Footer note */}
        <Text style={s.footer}>
          Contacts only receive alerts when BEACON is fired — never any other time.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: STEADY.bg.light },
  headerRow:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  eyebrow:          { fontSize: 11, fontWeight: '700', color: STEADY.ink.tertiary, letterSpacing: 1, textTransform: 'uppercase' },
  title:            { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, color: STEADY.ink.primary },
  closeBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: STEADY.bg.sunken, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  content:          { paddingHorizontal: 16, paddingBottom: 40 },
  privacyNote:      { padding: 12, borderRadius: STEADY.r.md, backgroundColor: STEADY.accent.soft, marginBottom: 16 },
  privacyText:      { fontSize: 13, color: STEADY.accent.deep, lineHeight: 19 },
  emptyState:       { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyIcon:        { fontSize: 36 },
  emptyTitle:       { fontSize: 16, fontWeight: '600', color: STEADY.ink.primary },
  emptySub:         { fontSize: 13, color: STEADY.ink.secondary, textAlign: 'center', lineHeight: 19 },
  contactList:      { gap: 8, marginBottom: 20 },
  contactCard:      { backgroundColor: '#fff', borderRadius: STEADY.r.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: STEADY.border.light },
  contactAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: STEADY.accent.soft, alignItems: 'center', justifyContent: 'center' },
  contactInfo:      { flex: 1, gap: 3 },
  contactName:      { fontSize: 15, fontWeight: '600', color: STEADY.ink.primary },
  phoneRow:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactPhone:     { fontSize: 12, color: STEADY.ink.secondary },
  contactPhoneMissing: { fontSize: 12, color: STEADY.ink.tertiary, fontStyle: 'italic' },
  deleteBtn:        { width: 30, height: 30, borderRadius: 15, backgroundColor: STEADY.emergency.soft, alignItems: 'center', justifyContent: 'center' },
  addCard:          { backgroundColor: '#fff', borderRadius: STEADY.r.lg, padding: 16, borderWidth: 1, borderColor: STEADY.border.light, gap: 14, marginBottom: 16 },
  addCardTitle:     { fontSize: 15, fontWeight: '700', color: STEADY.ink.primary },
  fieldWrap:        { gap: 6 },
  fieldLabel:       { fontSize: 12, fontWeight: '600', color: STEADY.ink.secondary, letterSpacing: 0.2 },
  input:            { backgroundColor: STEADY.bg.sunken, borderRadius: STEADY.r.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: STEADY.ink.primary, borderWidth: 1, borderColor: STEADY.border.light },
  fieldHint:        { fontSize: 11, color: STEADY.ink.tertiary },
  addBtn:           { height: 50, borderRadius: STEADY.r.lg, backgroundColor: STEADY.accent.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: STEADY.accent.base, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  addBtnDisabled:   { opacity: 0.6 },
  addBtnText:       { color: '#fff', fontSize: 15, fontWeight: '600' },
  footer:           { fontSize: 12, color: STEADY.ink.tertiary, textAlign: 'center', lineHeight: 18 },
})
