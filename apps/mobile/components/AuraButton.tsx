import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native'

interface Props {
  onPress: () => void
  loading?: boolean
  label: string
  subtitle: string
}

export function AuraButton({ onPress, loading = false, label, subtitle }: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Logs seizure start time and current weather"
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="large" />
      ) : (
        <View style={styles.inner}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#dc2626',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  inner: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
})
