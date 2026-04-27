import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native'

interface Props {
  onPress: () => void
  loading?: boolean
  label: string
  subtitle: string
}

export function BeaconButton({ onPress, loading = false, label, subtitle }: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Sends your location to emergency contacts"
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
    backgroundColor: '#d97706',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  inner: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: '#fff',
    fontSize: 20,
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
