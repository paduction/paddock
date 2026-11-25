import type { HassEntity } from '../ha/types'

export interface WeatherNow {
  condition: string | null
  humidity: number | null
  /** km/h */
  wind: number | null
  uv: number | null
}

export function toWeatherNow(entity?: HassEntity): WeatherNow {
  const a = entity?.attributes ?? {}
  return { condition: entity?.state ?? null, humidity: a.humidity ?? null, wind: a.wind_speed ?? null, uv: a.uv_index ?? null }
}

/** Is it night? Uses sun.sun when available, otherwise 19:00–07:00. */
export function isNight(sun: HassEntity | undefined, now: Date): boolean {
  if (sun) return sun.state !== 'above_horizon'
  const h = now.getHours()
  return h >= 19 || h < 7
}

const ICONS: Record<string, string> = {
  'clear-night': 'bedtime',
  cloudy: 'cloud',
  exceptional: 'warning',
  fog: 'foggy',
  hail: 'weather_hail',
  lightning: 'thunderstorm',
  'lightning-rainy': 'thunderstorm',
  pouring: 'rainy',
  rainy: 'rainy',
  snowy: 'weather_snowy',
  'snowy-rainy': 'weather_mix',
  windy: 'air',
  'windy-variant': 'air',
}

/** Home Assistant weather condition → Material Symbols icon. */
export function weatherIcon(condition: string | null, night: boolean): string {
  if (condition === 'partlycloudy') return night ? 'partly_cloudy_night' : 'partly_cloudy_day'
  if (condition === 'sunny') return night ? 'bedtime' : 'sunny'
  return (condition && ICONS[condition]) || 'cloud'
}

/** Item of weather/subscribe_forecast. */
export interface Forecast {
  datetime: string
  condition: string
  temperature: number
  templow?: number
  precipitation?: number
  precipitation_probability?: number
}

export type ForecastTone = 'rain' | 'sun' | 'neutral'

export function forecastTone(icon: string): ForecastTone {
  if (/rain|thunder|mix|hail|snow/.test(icon)) return 'rain'
  if (/sunny|partly_cloudy_day/.test(icon)) return 'sun'
  return 'neutral'
}

/** Rain as a probability (%) when available, otherwise millimetres; `level` ≥ 30 means wet. */
export function rainOf(f: Forecast): { level: number; probability?: number; mm?: number } {
  if (f.precipitation_probability != null) return { level: f.precipitation_probability, probability: Math.round(f.precipitation_probability) }
  if (f.precipitation != null) return { level: f.precipitation >= 1 ? 50 : f.precipitation > 0 ? 20 : 0, mm: f.precipitation }
  return { level: 0 }
}

/** Days with their bar position in the global min–max range (in %). */
export function dailyBars(days: Forecast[]) {
  const max = days.map((f) => Math.round(f.temperature))
  const min = days.map((f) => Math.round(f.templow ?? f.temperature))
  const hi = max.length ? Math.max(...max) : 1
  const lo = min.length ? Math.min(...min) : 0
  const range = Math.max(1, hi - lo)
  return days.map((f, i) => ({
    forecast: f,
    max: max[i],
    min: min[i],
    top: ((hi - max[i]) / range) * 100,
    height: Math.max(4, ((max[i] - min[i]) / range) * 100),
  }))
}

/** Next 12 hours (from the current hour), with night detection from sunrise / sunset. */
export function nextHours(hours: Forecast[], now: Date, sun?: HassEntity) {
  const rise = sun?.attributes.next_rising ? new Date(sun.attributes.next_rising) : null
  const set = sun?.attributes.next_setting ? new Date(sun.attributes.next_setting) : null
  const riseH = rise ? rise.getHours() + rise.getMinutes() / 60 : 7.5
  const setH = set ? set.getHours() + set.getMinutes() / 60 : 18
  return hours
    .filter((f) => Date.parse(f.datetime) >= now.getTime() - 3600e3)
    .slice(0, 12)
    .map((f) => {
      const h = new Date(f.datetime).getHours()
      return { forecast: f, hour: h, night: h + 0.5 < riseH || h >= setH }
    })
}

export type UvLevel = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme'
export const uvLevel = (v: number): UvLevel => (v < 3 ? 'low' : v < 6 ? 'moderate' : v < 8 ? 'high' : v < 11 ? 'veryHigh' : 'extreme')
