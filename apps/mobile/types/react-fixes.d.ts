/**
 * Patches a React 19 type incompatibility with @expo/vector-icons.
 *
 * React 19 changed ReactPortal.children to be required, but @expo/vector-icons
 * returns a ReactElement (which has no children field), making Ionicons
 * unusable as a JSX component in strict TypeScript. This augmentation restores
 * the original optional behaviour without downgrading @types/react.
 *
 * Track: https://github.com/expo/vector-icons/issues/316
 */
import 'react'

declare module 'react' {
  interface ReactPortal {
    children?: ReactNode
  }
}
