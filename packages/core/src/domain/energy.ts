import type { EnergyConfig } from '../config/schema'

/** Point of recorder/statistics_during_period (type "change", 5-minute period). */
export interface StatPoint {
  start: number | string
  change?: number | null
}

export interface EnergyDay {
  /** kWh per half hour, 48 slots from midnight */
  solar: number[]
  grid: number[]
  consumption: number[]
  /** Share of consumption covered by solar + battery today (%), null when not enough data */
  autonomy: number | null
  /** Share of production used at home today (%) */
  selfConsumption: number | null
}

export const SLOTS = 48
const SLOT_MS = 1800e3

const startOf = (p: StatPoint) => (typeof p.start === 'number' ? p.start : Date.parse(p.start))
const total = (a: number[]) => a.reduce((s, v) => s + v, 0)

/** Sums 5-minute statistics into half hours, and computes today's rates. */
export function energyDay(stats: Record<string, StatPoint[]>, cfg: EnergyConfig, dayStart: Date): EnergyDay {
  const slots = (id?: string) => {
    const out = new Array(SLOTS).fill(0)
    for (const p of (id && stats[id]) || []) {
      const i = Math.floor((startOf(p) - dayStart.getTime()) / SLOT_MS)
      if (i >= 0 && i < SLOTS && p.change != null) out[i] += Math.max(0, p.change)
    }
    return out
  }
  const solar = slots(cfg.solar)
  const grid = slots(cfg.grid)
  const green = slots(cfg.green)
  const discharge = slots(cfg.discharge)
  const charge = slots(cfg.charge)
  const used = total(green) + total(discharge) + total(grid)
  return {
    solar,
    grid,
    consumption: grid.map((g, i) => g + green[i] + discharge[i]),
    autonomy: used > 0.05 ? ((total(green) + total(discharge)) / used) * 100 : null,
    selfConsumption: total(solar) > 0.05 ? Math.min(100, ((total(green) + total(charge)) / total(solar)) * 100) : null,
  }
}

export const sumKwh = total

/** Index of the current half hour (at least 1, so "now" has a previous slot). */
export function currentSlot(now: Date): number {
  return Math.max(1, Math.min(SLOTS - 1, Math.floor((now.getHours() * 60 + now.getMinutes()) / 30)))
}

/** SVG paths of the day chart (kW = kWh per half hour × 2). */
export function chartPaths(day: EnergyDay | null, now: Date, width: number, height: number) {
  const production = (day?.solar ?? new Array(SLOTS).fill(0)).map((v) => v * 2)
  const consumption = (day?.consumption ?? new Array(SLOTS).fill(0)).map((v) => v * 2)
  const n = currentSlot(now)
  const maxKw = Math.max(1, Math.ceil(Math.max(...production.slice(0, n + 1), ...consumption.slice(0, n + 1))))
  const x = (i: number) => ((i / (SLOTS - 1)) * width).toFixed(1)
  const y = (v: number) => (height - (v / maxKw) * height).toFixed(1)
  let prod = ''
  let cons = ''
  for (let i = 0; i <= n; i++) {
    prod += `${i ? ' L' : 'M'}${x(i)} ${y(production[i])}`
    cons += `${i ? ' L' : 'M'}${x(i)} ${y(consumption[i])}`
  }
  return {
    production: prod,
    area: `${prod} L${x(n)} ${height} L0 ${height} Z`,
    consumption: cons,
    now: `M${x(n)} 0 V${height}`,
    maxKw,
    solarNow: production[n - 1] || 0,
    gridNow: day ? (day.grid[n - 1] || 0) * 2 : 0,
  }
}
