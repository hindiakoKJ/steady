import { View, Image, StyleSheet } from 'react-native'

interface Props {
  size?: number
}

export function SteadyMark({ size = 48 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../assets/images/icon.png')}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
