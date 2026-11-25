import type { RobotConfig, RobotModesConfig } from '../config/schema'
import { numericState, type HassEntity, type ServiceCall } from '../ha/types'

export interface Robot {
  state: string
  battery: number | null
  /** Current cleaning mode (select entity), and the available ones */
  mode: string | null
  modes: string[]
  /** Error code reported by the robot, null when none */
  error: string | null
  canPause: boolean
}

const SUPPORT_PAUSE = 4

export function toRobot(cfg: RobotConfig, e?: HassEntity, battery?: HassEntity, mode?: HassEntity, error?: HassEntity): Robot {
  const errorCode = error && !['no_error', 'unknown', 'unavailable', ''].includes(error.state) ? error.state : null
  return {
    state: e?.state ?? 'unavailable',
    battery: e?.attributes.battery_level ?? numericState(battery),
    mode: mode && mode.state !== 'unavailable' ? mode.state : null,
    modes: mode?.attributes.options ?? [],
    error: errorCode,
    canPause: !e || ((e.attributes.supported_features ?? 0) & SUPPORT_PAUSE) !== 0,
  }
}

/** Docked but not full: charging. */
export const isCharging = (r: Robot) => r.state === 'docked' && r.battery !== null && r.battery < 100

export function robotStartCall(cfg: RobotConfig, rooms: string[]): ServiceCall {
  if (rooms.length && cfg.rooms) {
    const order = cfg.rooms.map((r) => r.area).filter((a) => rooms.includes(a))
    return { domain: 'vacuum', service: 'clean_area', target: cfg.entity, data: { cleaning_area_id: order } }
  }
  return { domain: 'vacuum', service: 'start', target: cfg.entity }
}

export const robotPauseCall = (cfg: RobotConfig, r: Robot): ServiceCall => ({ domain: 'vacuum', service: r.canPause ? 'pause' : 'stop', target: cfg.entity })
export const robotDockCall = (cfg: RobotConfig): ServiceCall => ({ domain: 'vacuum', service: 'return_to_base', target: cfg.entity })

/** Cycles through the cleaning modes. */
export function robotModeCall(cfg: RobotConfig, r: Robot): ServiceCall | null {
  if (!cfg.mode || !r.modes.length) return null
  const next = r.modes[(r.modes.indexOf(r.mode ?? '') + 1) % r.modes.length]
  return { domain: 'select', service: 'select_option', target: cfg.mode, data: { option: next } }
}

/* ---------- Mode grid: what × intensity ---------- */

export interface ModeChoice {
  kind: string
  level: string
}

/** Select option → choice, null when the option is not in the grid. */
export function modeChoiceOf(grid: RobotModesConfig, option: string | null): ModeChoice | null {
  if (!option) return null
  for (const [kind, levels] of Object.entries(grid.options)) {
    for (const [level, value] of Object.entries(levels)) if (value === option) return { kind, level }
  }
  return null
}

/** Choice → select option, null when this pair does not exist (or the robot does not offer it). */
export function modeOptionOf(grid: RobotModesConfig, choice: ModeChoice, offered: string[] = []): string | null {
  const option = grid.options[choice.kind]?.[choice.level] ?? null
  return option && (!offered.length || offered.includes(option)) ? option : null
}

/** Keeps the choice valid: when the level does not exist for this kind, takes the default level, then the first one. */
export function fixChoice(grid: RobotModesConfig, choice: ModeChoice, offered: string[] = []): ModeChoice {
  if (modeOptionOf(grid, choice, offered)) return choice
  const levels = [grid.default?.level, ...grid.levels.map((l) => l.id)].filter((l): l is string => !!l)
  const level = levels.find((l) => modeOptionOf(grid, { kind: choice.kind, level: l }, offered))
  return level ? { kind: choice.kind, level } : choice
}

export const robotSetModeCall = (select: string, option: string): ServiceCall => ({ domain: 'select', service: 'select_option', target: select, data: { option } })

/** How much of a zone is selected. */
export function zoneState(rooms: string[], selected: string[]): 'off' | 'partial' | 'on' {
  const n = rooms.filter((r) => selected.includes(r)).length
  return n === 0 ? 'off' : n === rooms.length ? 'on' : 'partial'
}

/** Tapping a zone: selects all its rooms, or clears them when they are all selected already. */
export function toggleZone(rooms: string[], selected: string[]): string[] {
  return zoneState(rooms, selected) === 'on' ? selected.filter((r) => !rooms.includes(r)) : [...selected, ...rooms.filter((r) => !selected.includes(r))]
}

/** The zone whose rooms are exactly the selection, if any. */
export function selectedZone<Z extends { rooms: string[] }>(zones: Z[], selected: string[]): Z | null {
  return zones.find((z) => z.rooms.length === selected.length && z.rooms.every((r) => selected.includes(r))) ?? null
}
