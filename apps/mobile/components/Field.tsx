import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { STEADY } from '@repo/ui'

interface Props {
  label: string
  value: string
  onChangeText: (v: string) => void
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}

export function Field({ label, value, onChangeText, type = 'text', placeholder, autoCapitalize }: Props) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <View style={s.field}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !show}
          keyboardType={type === 'email' ? 'email-address' : 'default'}
          autoCapitalize={autoCapitalize ?? (type === 'email' ? 'none' : 'sentences')}
          autoCorrect={false}
          placeholder={placeholder}
          placeholderTextColor={STEADY.ink.onDarkTer}
        />
        {isPassword && (
          <Pressable onPress={() => setShow(!show)} hitSlop={8}>
            {show
              ? <Ionicons name="eye-off-outline" size={18} color={STEADY.ink.onDarkSec} />
              : <Ionicons name="eye-outline" size={18} color={STEADY.ink.onDarkSec} />
            }
          </Pressable>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  label: {
    fontSize: 12,
    color: STEADY.ink.onDarkSec,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  field: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: STEADY.r.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: STEADY.border.dark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: STEADY.ink.onDark,
  },
})
