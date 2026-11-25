/** Minimal Home Assistant types used by Paddock (subset of home-assistant-js-websocket). */

export interface HassEntity {
  entity_id: string
  state: string
  attributes: Record<string, any>
  last_changed: string
  last_updated: string
}

export type HassEntities = Record<string, HassEntity>

/** A service call DESCRIPTION. Domain functions build these; the app sends them. */
export interface ServiceCall {
  domain: string
  service: string
  target: string | string[]
  data?: Record<string, unknown>
}

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'error'

/** States that mean "we know nothing about this entity right now". */
export const UNKNOWN_STATES = ['unknown', 'unavailable']

export function isAvailable(entity?: HassEntity): entity is HassEntity {
  return entity !== undefined && entity.state !== 'unavailable'
}

/** Numeric state, or null when missing / not a number. */
export function numericState(entity?: HassEntity): number | null {
  if (!entity) return null
  const value = parseFloat(entity.state)
  return Number.isNaN(value) ? null : value
}
