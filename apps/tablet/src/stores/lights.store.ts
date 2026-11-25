import { useRef } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import {
  allOffCall,
  brightnessCall,
  sceneCall,
  toggleCall,
  toLight,
  type Light,
  type LightConfig,
} from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { useHass } from './hass.store'

/**
 * Local state that wins over Home Assistant for a few seconds after a touch,
 * so the tile never jumps back while HA is still applying the change.
 */
interface Override {
  on: boolean
  brightness: number
  until: number
}

interface LightsState {
  overrides: Record<string, Override>
  activeScene: string | null
  toggle: (light: Light) => void
  setLevel: (light: Light, level: number, phase: 'preview' | 'commit') => void
  allOff: (lights: Light[]) => void
  applyScene: (id: string) => void
}

const HOLD_WHILE_DRAGGING = 4000
const HOLD_AFTER_ACTION = 2500
const timers: Record<string, ReturnType<typeof setTimeout>> = {}

export const useLights = create<LightsState>()((set, get) => {
  /** Shows `patch` immediately and keeps it for `ms`, then lets Home Assistant take over again. */
  function hold(id: string, patch: Omit<Override, 'until'>, ms: number) {
    set((s) => ({ activeScene: null, overrides: { ...s.overrides, [id]: { ...patch, until: Date.now() + ms } } }))
    clearTimeout(timers[id])
    timers[id] = setTimeout(() => {
      const { [id]: _, ...rest } = get().overrides
      set({ overrides: rest })
    }, ms)
  }

  return {
    overrides: {},
    activeScene: null,

    toggle: (light) => {
      if (!light.available) return
      hold(light.id, { on: !light.on, brightness: light.brightness }, HOLD_AFTER_ACTION)
      ha.call(toggleCall(light))
    },

    // Level 0 (finger past the left edge) shows the light off but keeps its last brightness,
    // so dragging back onto the tile brings the percentage back.
    setLevel: (light, level, phase) => {
      const patch = level > 0 ? { on: true, brightness: level } : { on: false, brightness: light.brightness }
      if (phase === 'preview') {
        hold(light.id, patch, HOLD_WHILE_DRAGGING)
        return
      }
      hold(light.id, patch, HOLD_AFTER_ACTION)
      ha.call(brightnessCall(light, level))
    },

    allOff: (lights) => {
      const call = allOffCall(lights)
      if (!call) return
      lights.filter((l) => l.on && l.available).forEach((l) => hold(l.id, { on: false, brightness: l.brightness }, HOLD_AFTER_ACTION))
      ha.call(call)
    },

    applyScene: (id) => {
      const scene = config.lighting.scenes.find((s) => s.id === id)
      if (!scene) return
      set({ activeScene: id })
      ha.call(sceneCall(scene.entity))
    },
  }
})

/** Live view of a set of lights (HA state + local overrides). Re-renders only when one of them changes. */
export function useLightList(configs: LightConfig[]): Light[] {
  const memory = useRef<Record<string, Light>>({})
  // Only the entities of these lights: an update elsewhere in the house does not re-render this list.
  const entities = useHass(useShallow((s) => configs.flatMap((c) => [s.entities[c.entity], c.presence ? s.entities[c.presence] : undefined])))
  const overrides = useLights((s) => s.overrides)
  return configs.map((cfg, i) => {
    let light = toLight(cfg, entities[2 * i], memory.current[cfg.id], entities[2 * i + 1])
    const o = overrides[cfg.id]
    if (o) light = { ...light, on: o.on, brightness: o.brightness }
    memory.current[cfg.id] = light
    return light
  })
}
