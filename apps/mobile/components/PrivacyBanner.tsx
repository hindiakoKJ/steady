import { View, Text, StyleSheet } from 'react-native'

interface Props {
  text: string
}

export function PrivacyBanner({ text }: Props) {
  return (
    <View style={styles.banner}>
      <Text style={styles.lock}>🔒</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2d1f',
    borderWidth: 1,
    borderColor: '#166534',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginHorizontal: 0,
  },
  lock: {
    fontSize: 14,
  },
  text: {
    flex: 1,
    color: '#86efac',
    fontSize: 11,
    lineHeight: 16,
  },
})
