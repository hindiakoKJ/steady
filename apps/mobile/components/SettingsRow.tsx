import { View, Text, Pressable, StyleSheet, Switch } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { STEADY } from '@repo/ui'
import type { ReactNode } from 'react'

interface RowProps {
  icon: ReactNode
  iconColor: string
  iconBg: string
  title: string
  sub?: string
  toggle?: boolean
  toggleValue?: boolean
  onToggle?: (v: boolean) => void
  onPress?: () => void
  last?: boolean
}

export function SettingRow({ icon, iconColor, iconBg, title, sub, toggle, toggleValue, onToggle, onPress, last }: RowProps) {
  return (
    <Pressable
      style={[s.row, last && s.rowLast]}
      onPress={onPress}
      disabled={toggle && !onPress}
    >
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={s.text}>
        <Text style={s.title}>{title}</Text>
        {sub && <Text style={s.sub}>{sub}</Text>}
      </View>
      {toggle
        ? <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: STEADY.border.light, true: STEADY.accent.base }}
            thumbColor="#fff"
          />
        : <ChevronRight size={16} color={STEADY.ink.tertiary} />
      }
    </Pressable>
  )
}

interface GroupProps {
  title: string
  children: ReactNode
}

export function SettingsGroup({ title, children }: GroupProps) {
  return (
    <View style={s.group}>
      <Text style={s.groupTitle}>{title}</Text>
      <View style={s.groupBody}>{children}</View>
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: STEADY.border.light,
  },
  rowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '500', color: STEADY.ink.primary },
  sub:   { fontSize: 12, color: STEADY.ink.secondary, marginTop: 1 },
  group: { marginBottom: 18 },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: STEADY.ink.tertiary,
    paddingHorizontal: 6,
    paddingBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupBody: {
    backgroundColor: '#fff',
    borderRadius: STEADY.r.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: STEADY.border.light,
  },
})
