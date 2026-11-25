import { config } from '../config'
import { en } from './en'
import { fr, type MessageKey } from './fr'

const messages: Record<string, Record<MessageKey, string>> = { fr, en }
export const locale = config.locale
const dict = messages[locale] ?? fr

/**
 * t('lights.countOn', { n: 2 }) → "2 allumées".
 * A message "singular|plural" picks the form from `n`.
 */
export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  let text: string = dict[key] ?? key
  if (text.includes('|')) {
    const [one, many] = text.split('|')
    text = Number(vars.n) > 1 ? many : one
  }
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''))
}

/** 12.8 → "12,8" (fr) / "12.8" (en); null → "—" */
export function decimal(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return '—'
  return value.toFixed(digits).replace('.', locale === 'fr' ? ',' : '.')
}

const lang = locale === 'fr' ? 'fr-FR' : 'en-GB'
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const formatTime = (d: Date) => d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
export const formatLongDate = (d: Date) => capitalize(d.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' }))
export const formatWeekday = (d: Date) => capitalize(d.toLocaleDateString(lang, { weekday: 'short' }))
export const formatShortDate = (d: Date) => d.toLocaleDateString(lang, { day: 'numeric', month: 'short' })

/** "since 5 min", "since 2 h 05", "since 3 days" */
export function since(time: number | null, now: number): string {
  if (!time) return ''
  const minutes = Math.max(0, Math.round((now - time) / 60000))
  if (minutes < 1) return t('ago.now')
  if (minutes < 60) return t('ago.minutes', { n: minutes })
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? t('ago.hoursMinutes', { h, m: String(m).padStart(2, '0') }) : t('ago.hours', { h })
  }
  return t('ago.days', { n: Math.floor(minutes / 1440) })
}
export const formatDate = (d: Date, options: Intl.DateTimeFormatOptions) => d.toLocaleDateString(lang, options)
