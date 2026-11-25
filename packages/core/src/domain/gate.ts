import { isAvailable, type HassEntity, type ServiceCall } from '../ha/types'

export type GateState = 'open' | 'closed' | 'opening' | 'closing'

export interface Gate {
  entity: string
  state: GateState
  available: boolean
  /** When it was opened (ms), null when not open. */
  openSince: number | null
}

export function toGate(entity: string, e?: HassEntity): Gate {
  const state = (['open', 'closed', 'opening', 'closing'].includes(e?.state ?? '') ? e!.state : 'closed') as GateState
  return { entity, state, available: isAvailable(e), openSince: state === 'open' && e ? Date.parse(e.last_changed) : null }
}

export const isMoving = (g: Gate) => g.state === 'opening' || g.state === 'closing'

export function minutesOpen(g: Gate, now: number): number {
  return g.openSince === null ? 0 : Math.max(0, Math.floor((now - g.openSince) / 60000))
}

/** Single-button gate: open and close send the same pulse, we pick the right service anyway. */
export function gateCall(g: Gate): ServiceCall {
  return { domain: 'cover', service: g.state === 'closed' ? 'open_cover' : 'close_cover', target: g.entity }
}
