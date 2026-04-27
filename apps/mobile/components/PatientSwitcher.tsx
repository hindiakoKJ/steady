import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Patient } from '@repo/types'

interface Props {
  currentPatient: Patient | null
  onSwitch: () => void
  switchLabel: string
  currentLabel: string
}

export function PatientSwitcher({ currentPatient, onSwitch, switchLabel, currentLabel }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{currentLabel}</Text>
      <TouchableOpacity style={styles.pill} onPress={onSwitch}>
        <Text style={styles.name}>{currentPatient?.nickname ?? '—'}</Text>
        <Text style={styles.switch}>{switchLabel} ↓</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  name: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
  },
  switch: {
    color: '#10b981',
    fontSize: 12,
  },
})
