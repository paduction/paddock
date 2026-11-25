import type { PersonConfig } from '../config/schema'
import { UNKNOWN_STATES, type HassEntity } from '../ha/types'

export interface Person {
  name: string
  initial: string
  /** A phone (or other tracker) reports where this person is. */
  tracked: boolean
  home: boolean
  /** Raw HA state: 'home', 'not_home' or a zone name. */
  state: string
  since: number | null
}

export function toPerson(cfg: PersonConfig, entity?: HassEntity): Person {
  const tracked = !!entity && !UNKNOWN_STATES.includes(entity.state)
  return {
    name: cfg.name,
    initial: cfg.name.charAt(0),
    tracked,
    home: tracked && entity!.state === 'home',
    state: entity?.state ?? 'unknown',
    since: entity ? Date.parse(entity.last_changed) : null,
  }
}

export type HomeSummary =
  | { kind: 'nobody' }
  | { kind: 'everyone' }
  | { kind: 'one'; name: string }
  | { kind: 'some'; count: number }

export function homeSummary(people: Person[]): HomeSummary {
  const home = people.filter((p) => p.home)
  if (home.length === 0) return { kind: 'nobody' }
  if (home.length === people.length) return { kind: 'everyone' }
  if (home.length === 1) return { kind: 'one', name: home[0].name }
  return { kind: 'some', count: home.length }
}
