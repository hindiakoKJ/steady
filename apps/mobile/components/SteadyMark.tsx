import Svg, { Path, Circle } from 'react-native-svg'

interface Props {
  size?: number
  color?: string
}

export function SteadyMark({ size = 48, color = '#2E7D7A' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="32" r="32" fill={color} opacity={0.15} />
      <Path
        d="M32 10 L50 20 L50 38 C50 48 32 54 32 54 C32 54 14 48 14 38 L14 20 Z"
        fill={color}
        opacity={0.9}
      />
      <Path
        d="M24 32 C24 28 27 26 30 26 C33 26 35 28 35 30 C35 32 33 33 30 33 C27 33 25 35 25 38 C25 41 28 43 31 43 C34 43 37 41 37 38"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}
