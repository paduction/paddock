import { useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { coversCall, positionCall, toCover, type Cover, type CoverConfig } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { useHass } from './hass.store'
import { createHold } from './hold'

/** Position / direction shown right after a command, before Home Assistant reports it. */
const held = createHold<{ position?: number; moving: Cover['moving'] }>()

/** Live view of covers. Re-renders only when one of them changes. */
export function useCoverList(configs: CoverConfig[] = config.covers): Cover[] {
  const memory = useRef<Record<string, Cover>>({})
  const entities = useHass(useShallow((s) => configs.map((c) => s.entities[c.entity])))
  const overrides = held.useAll()
  return configs.map((cfg, i) => {
    const cover = toCover(cfg, entities[i], memory.current[cfg.id])
    memory.current[cfg.id] = cover
    const o = overrides[cfg.id]
    return o ? { ...cover, position: o.position ?? cover.position, moving: o.moving } : cover
  })
}

export function moveCovers(covers: Cover[], command: 'up' | 'down' | 'stop') {
  const call = coversCall(covers, command)
  if (!call) return
  for (const c of covers.filter((x) => x.available)) {
    const target = command === 'up' ? 100 : command === 'down' ? 0 : c.position
    held.hold(c.id, { moving: target > c.position ? 'up' : target < c.position ? 'down' : null }, 1500)
  }
  ha.call(call)
}

/** Drag on a cover tile: follows the finger, sends the position on release. */
export function setCoverPosition(cover: Cover, position: number, phase: 'preview' | 'commit') {
  held.hold(cover.id, { position, moving: null }, phase === 'preview' ? 4000 : 3000)
  if (phase === 'commit') ha.call(positionCall(cover, position))
}
