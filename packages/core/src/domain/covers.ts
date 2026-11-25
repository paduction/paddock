import type { CoverConfig } from '../config/schema'
import { isAvailable, type HassEntity, type ServiceCall } from '../ha/types'

export interface Cover extends CoverConfig {
  available: boolean
  /** 0 = closed, 100 = open */
  position: number
  moving: 'up' | 'down' | null
}

export function toCover(cfg: CoverConfig, e?: HassEntity, previous?: Cover): Cover {
  const p = e?.attributes.current_position
  const position = p ?? (e?.state === 'open' ? 100 : e?.state === 'closed' ? 0 : (previous?.position ?? 0))
  return {
    ...cfg,
    available: isAvailable(e),
    position,
    moving: e?.state === 'opening' ? 'up' : e?.state === 'closing' ? 'down' : null,
  }
}

export const isOpen = (c: Cover) => c.position > 0

export function coversCall(covers: Cover[], command: 'up' | 'down' | 'stop'): ServiceCall | null {
  const targets = covers.filter((c) => c.available).map((c) => c.entity)
  if (!targets.length) return null
  const service = command === 'up' ? 'open_cover' : command === 'down' ? 'close_cover' : 'stop_cover'
  return { domain: 'cover', service, target: targets }
}

export function positionCall(cover: Cover, position: number): ServiceCall {
  return { domain: 'cover', service: 'set_cover_position', target: cover.entity, data: { position } }
}

/** Groups in the order they first appear in the config. */
export function coverGroups<T extends { group: string }>(covers: T[]): { name: string; covers: T[] }[] {
  const groups: { name: string; covers: T[] }[] = []
  for (const c of covers) {
    const g = groups.find((x) => x.name === c.group)
    if (g) g.covers.push(c)
    else groups.push({ name: c.group, covers: [c] })
  }
  return groups
}
