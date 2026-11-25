import { activeDays, type AutomatableDevice, type Automation, type Trigger } from '@paddock/core'
import { t } from '../i18n'

/** "Weekdays", "Weekend", "Every day", or the days one by one. */
export function daysText(trigger: Trigger): string {
  const days = activeDays(trigger)
  const key = days.join('')
  if (days.length === 7) return t('automations.everyDay')
  if (key === '01234') return t('automations.weekdays')
  if (key === '56') return t('automations.weekend')
  return days.map((d) => t(`automations.dayShort.${d}`)).join(' ')
}

/** The moment alone: "06:00 → 08:00", "Sunset +15 min", "Everyone has left"; nothing for a mode. */
export function momentText(trigger: Trigger): string {
  if (trigger.type === 'manual') return ''
  if (trigger.type === 'time') return trigger.end ? `${trigger.at} → ${trigger.end}` : trigger.at
  if (trigger.type === 'presence') return t(trigger.event === 'everyone_left' ? 'automations.everyoneLeft' : 'automations.someoneArrived')
  const offset = trigger.offset === 0 ? '' : ` ${trigger.offset > 0 ? '+' : '−'}${Math.abs(trigger.offset)} min`
  return t(trigger.event === 'sunrise' ? 'automations.sunrise' : 'automations.sunset') + offset
}

export const whenText = (trigger: Trigger) => (trigger.type === 'manual' ? '' : `${daysText(trigger)} · ${momentText(trigger)}`)

/** One device: "Pump · Turn on"; several: "3 shutters · 2 lights". */
export function whatText(automation: Automation, devices: AutomatableDevice[]): string {
  const known = automation.actions.map((a) => ({ action: a, device: devices.find((d) => d.entity === a.entity) })).filter((x) => x.device)
  if (!known.length) return t('automations.nothing')
  if (known.length === 1) {
    const { action, device } = known[0]
    const what = action.do === 'position' ? t((action.value ?? 0) <= 20 ? 'automations.do.ajar' : 'automations.do.position', { n: action.value ?? 0 }) : t(`automations.do.${action.do}`)
    return `${device!.name} · ${what}`
  }
  const count = (kinds: AutomatableDevice['kind'][]) => known.filter((x) => kinds.includes(x.device!.kind)).length
  const parts: string[] = []
  if (count(['cover', 'gate'])) parts.push(t('automations.covers', { n: count(['cover', 'gate']) }))
  if (count(['light'])) parts.push(t('automations.lights', { n: count(['light']) }))
  if (count(['switch', 'scene'])) parts.push(t('automations.others', { n: count(['switch', 'scene']) }))
  return parts.join(' · ')
}
