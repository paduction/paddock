import type { LightConfig, LightingRow } from '../config/schema'
import { isAvailable, type HassEntity, type ServiceCall } from '../ha/types'

/** What the UI needs to know about a light — nothing more. */
export interface Light extends LightConfig {
  on: boolean
  available: boolean
  /** Last known brightness, 1–100 %. Kept while the light is off so it comes back at the same level. */
  brightness: number
  /** Occupancy sensor of the room is on. */
  occupied: boolean
}

/** Raw Home Assistant entity → clean Light. `previous` keeps the brightness memory. */
export function toLight(cfg: LightConfig, entity: HassEntity | undefined, previous?: Light, presence?: HassEntity): Light {
  const raw = entity?.attributes.brightness as number | undefined
  return {
    ...cfg,
    on: entity?.state === 'on',
    available: isAvailable(entity),
    brightness: raw ? Math.max(1, Math.round(raw / 2.55)) : (previous?.brightness ?? 100),
    occupied: presence?.state === 'on',
  }
}

/** Level shown on the tile: 0 when off or offline. */
export function displayedLevel(light: Light): number {
  return light.on && light.available ? light.brightness : 0
}

export function isLit(light: Light): boolean {
  return light.on && light.available
}

export function countLit(lights: Light[]): number {
  return lights.filter(isLit).length
}

/** Rows of the Lighting page, in the configured order. */
export function lightingRows(rows: LightingRow[], lights: Light[]) {
  return rows.map((row) =>
    row.type === 'room' ? { ...row, lights: lights.filter((l) => l.room === row.room) } : { ...row, lights: [] },
  )
}

/* ---- Actions: we only DESCRIBE what to send, the store sends it ---- */

export function toggleCall(light: Light): ServiceCall {
  return { domain: 'light', service: 'toggle', target: light.entity }
}

/** 0 % turns the light off; anything else sets the brightness (1–100 %). */
export function brightnessCall(light: Light, percent: number): ServiceCall {
  if (percent <= 0) return { domain: 'light', service: 'turn_off', target: light.entity }
  return { domain: 'light', service: 'turn_on', target: light.entity, data: { brightness_pct: Math.max(1, Math.min(100, Math.round(percent))) } }
}

export function allOffCall(lights: Light[]): ServiceCall | null {
  const lit = lights.filter(isLit).map((l) => l.entity)
  return lit.length ? { domain: 'light', service: 'turn_off', target: lit } : null
}

export function sceneCall(entity: string): ServiceCall {
  return { domain: 'scene', service: 'turn_on', target: entity }
}
