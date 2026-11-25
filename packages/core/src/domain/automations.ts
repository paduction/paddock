import type { PaddockConfig } from '../config/schema'

/**
 * Automations: schedules ("pool pump from 6 to 8") and modes ("Leaving": a button that sets several devices).
 * They are kept and run by the Paddock integration in Home Assistant; the interface only edits them.
 * The same shapes are checked on that side in custom_components/paddock/automations_model.py: change both.
 */

/** 0 = Monday … 6 = Sunday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Trigger =
  /** A button in the interface */
  | { type: 'manual' }
  /** At `at` ("06:00"); with `end`, what was switched on is switched off then */
  | { type: 'time'; at: string; end?: string; days?: Weekday[] }
  /** `offset` minutes after (negative: before) sunrise or sunset */
  | { type: 'sun'; event: 'sunrise' | 'sunset'; offset: number; days?: Weekday[] }
  /** The last person leaves home / the first person comes back */
  | { type: 'presence'; event: 'everyone_left' | 'someone_arrived'; days?: Weekday[] }

export type ActionKind = 'on' | 'off' | 'open' | 'close' | 'position' | 'scene'

export interface AutomationAction {
  entity: string
  do: ActionKind
  /** Shutter position in % (do: position) */
  value?: number
}

export interface Automation {
  /** Given by Home Assistant when first saved */
  id?: string
  name: string
  icon: string
  enabled: boolean
  trigger: Trigger
  actions: AutomationAction[]
  /** ISO time of the last run */
  last_run?: string
}

/** A device an automation can act on, with the choices offered for it. */
export interface AutomatableDevice {
  entity: string
  name: string
  /** Room or family, for grouping in the editor */
  group: string
  icon: string
  kind: 'light' | 'switch' | 'cover' | 'scene' | 'gate'
  choices: ActionKind[]
}

/** Shutter positions offered in the editor, besides open and closed. */
export const COVER_POSITIONS = [20, 50] as const

/**
 * Devices of the configuration that automations may use: lights, shutters, scenes, outdoor devices, the amplifier.
 * The gate can be closed, never opened: nothing opens the house on its own.
 * `groups` names the families that have no room of their own.
 */
export function automatableDevices(config: PaddockConfig, groups: { scenes: string; outdoor: string; cinema: string; gate: string }): AutomatableDevice[] {
  const out: AutomatableDevice[] = []
  for (const light of config.lighting.lights) out.push({ entity: light.entity, name: light.name, group: light.room, icon: light.icon, kind: 'light', choices: ['on', 'off'] })
  for (const cover of config.covers) out.push({ entity: cover.entity, name: cover.name, group: cover.group, icon: 'blinds', kind: 'cover', choices: ['open', 'position', 'close'] })
  for (const scene of config.lighting.scenes) out.push({ entity: scene.entity, name: scene.name, group: groups.scenes, icon: scene.icon, kind: 'scene', choices: ['scene'] })
  const outdoor = [...(config.outdoor?.poolDevice ? [config.outdoor.poolDevice] : []), ...(config.outdoor?.devices ?? [])]
  for (const device of outdoor) out.push({ entity: device.entity, name: device.name, group: groups.outdoor, icon: device.icon, kind: 'switch', choices: ['on', 'off'] })
  const cinema = config.home.cinema
  if (cinema) out.push({ entity: cinema.amplifier, name: groups.cinema, group: groups.cinema, icon: 'speaker', kind: 'switch', choices: ['on', 'off'] })
  const gate = config.home.gate
  const seen = new Set<string>()
  const unique = out.filter((d) => d.entity !== gate?.entity && !seen.has(d.entity) && seen.add(d.entity))
  if (gate) unique.push({ entity: gate.entity, name: gate.name, group: groups.gate, icon: 'garage_home', kind: 'gate', choices: ['close'] })
  return unique
}

/** A new automation, ready for the editor. */
export function newAutomation(kind: 'mode' | 'schedule'): Automation {
  return kind === 'mode'
    ? { name: '', icon: 'bolt', enabled: true, trigger: { type: 'manual' }, actions: [] }
    : { name: '', icon: 'schedule', enabled: true, trigger: { type: 'time', at: '07:00' }, actions: [] }
}

/** Modes are run by hand; everything else runs by itself. */
export const isMode = (a: Automation) => a.trigger.type === 'manual'

/** Sets, changes or removes (do: null) what an automation does with one device. */
export function withAction(a: Automation, entity: string, action: { do: ActionKind; value?: number } | null): Automation {
  const others = a.actions.filter((x) => x.entity !== entity)
  return { ...a, actions: action ? [...others, { entity, ...action }] : others }
}

export const actionFor = (a: Automation, entity: string) => a.actions.find((x) => x.entity === entity) ?? null

/** Same choice in the editor? (a position is one choice per value) */
export const sameAction = (a: AutomationAction | null, kind: ActionKind, value?: number) => !!a && a.do === kind && (kind !== 'position' || a.value === value)

export function withDay(trigger: Trigger, day: Weekday): Trigger {
  if (trigger.type === 'manual') return trigger
  const days = trigger.days ?? []
  const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()
  // all seven = every day = no restriction
  return { ...trigger, days: next.length === 7 || next.length === 0 ? undefined : next }
}

/** The whole week when no day is chosen. */
export const activeDays = (trigger: Trigger): Weekday[] => (trigger.type === 'manual' ? [] : trigger.days?.length ? trigger.days : [0, 1, 2, 3, 4, 5, 6])

export type AutomationProblem = 'name' | 'actions' | 'time' | 'end'

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

/** What stops an automation from being saved (the integration checks again). */
export function automationProblems(a: Automation): AutomationProblem[] {
  const out: AutomationProblem[] = []
  if (!a.name.trim()) out.push('name')
  if (!a.actions.length) out.push('actions')
  if (a.trigger.type === 'time') {
    if (!CLOCK.test(a.trigger.at)) out.push('time')
    if (a.trigger.end !== undefined && (!CLOCK.test(a.trigger.end) || a.trigger.end === a.trigger.at)) out.push('end')
  }
  return out
}

/** Modes first, then by time of day, then the others; same order on every screen. */
export function sortAutomations(list: Automation[]): Automation[] {
  const rank = (a: Automation) => (a.trigger.type === 'manual' ? '0' : a.trigger.type === 'time' ? `1${a.trigger.at}` : a.trigger.type === 'sun' ? `2${a.trigger.event}` : '3')
  return [...list].sort((a, b) => rank(a).localeCompare(rank(b)) || a.name.localeCompare(b.name))
}
