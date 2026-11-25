import { isAvailable, numericState, type HassEntity, type ServiceCall } from '../ha/types'

export interface Thermostat {
  available: boolean
  mode: string
  action: string | null
  current: number | null
  target: number
  min: number
  max: number
  presets: string[]
  preset: string | null
  /** The thermostat has no target temperature: it is driven with presets (comfort, eco…). */
  usesPresets: boolean
}

/** Presets shown, in this order, when the thermostat supports them. */
export const PRESET_ORDER = ['away', 'eco', 'comfort', 'boost'] as const
export const HVAC_MODES = ['heat', 'off', 'auto'] as const
/** Range of the temperature ruler. */
export const RULER = { min: 16, max: 26, step: 0.5 }

const SUPPORTS_TARGET_TEMPERATURE = 1

export function toThermostat(entity: HassEntity | undefined, sensor?: HassEntity, previousTarget = 19): Thermostat {
  const a = entity?.attributes ?? {}
  const presets: string[] = Array.isArray(a.preset_modes) ? a.preset_modes : []
  return {
    available: isAvailable(entity),
    mode: entity?.state ?? 'off',
    action: a.hvac_action ?? null,
    current: a.current_temperature ?? numericState(sensor),
    target: a.temperature ?? previousTarget,
    min: a.min_temp ?? RULER.min,
    max: a.max_temp ?? RULER.max,
    presets,
    preset: a.preset_mode ?? null,
    usesPresets: !!entity && !((a.supported_features ?? 0) & SUPPORTS_TARGET_TEMPERATURE) && presets.length > 0,
  }
}

export function isHeating(t: Thermostat): boolean {
  if (t.mode === 'off') return false
  if (t.action) return t.action === 'heating'
  return t.current !== null && t.current < t.target - 0.05
}

/** Rounds to 0.5 °C and keeps within the ruler and the thermostat limits. */
export function clampTarget(t: Thermostat, value: number): number {
  const lo = Math.max(RULER.min, t.min)
  const hi = Math.min(RULER.max, t.max)
  return Math.max(lo, Math.min(hi, Math.round(value * 2) / 2))
}

/** Ruler position 0–1 → temperature. */
export const temperatureAt = (ratio: number) => RULER.min + ratio * (RULER.max - RULER.min)
/** Temperature → ruler position 0–100 %. */
export const rulerPercent = (value: number) => Math.max(0, Math.min(100, ((value - RULER.min) / (RULER.max - RULER.min)) * 100))

export function availablePresets(t: Thermostat): string[] {
  return PRESET_ORDER.filter((p) => t.presets.includes(p))
}

/** Next (dir = 1) or previous (dir = -1) preset, for the + / − buttons. */
export function steppedPreset(t: Thermostat, dir: 1 | -1): string | null {
  const order = availablePresets(t)
  if (!order.length) return null
  const i = t.preset ? order.indexOf(t.preset) : -1
  const j = i < 0 ? (dir > 0 ? 0 : order.length - 1) : Math.max(0, Math.min(order.length - 1, i + dir))
  return order[j]
}

export const temperatureCall = (entity: string, temperature: number): ServiceCall => ({ domain: 'climate', service: 'set_temperature', target: entity, data: { temperature } })
export const hvacModeCall = (entity: string, hvac_mode: string): ServiceCall => ({ domain: 'climate', service: 'set_hvac_mode', target: entity, data: { hvac_mode } })
export const presetCall = (entity: string, preset_mode: string): ServiceCall => ({ domain: 'climate', service: 'set_preset_mode', target: entity, data: { preset_mode } })
