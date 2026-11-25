import { useShallow } from 'zustand/react/shallow'
import { amplifierCall, cinemaCall, cinemaStatus, cinemaSteps, projectorCall, screenCall, screenState, type CinemaStatus, type CinemaSteps } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { useClock } from './clock.store'
import { useHass } from './hass.store'
import { createHold } from './hold'

const held = createHold<{ on: boolean; since: number }>()
const switches = createHold<boolean>()

export interface CinemaView {
  status: CinemaStatus
  steps: CinemaSteps
  on: boolean
  screen: { down: boolean; moving: 'down' | 'up' | null }
}

const screenHeld = createHold<{ down: boolean; moving: 'down' | 'up' | null }>()

/** Cinema mode: the input_boolean plus the real state of each step (lights, screen, projector, amp). */
export function useCinema(litLights: string[]): CinemaView | null {
  const cfg = config.home.cinema
  const entities = useHass(
    useShallow((s) => {
      if (!cfg) return [] as const
      const ids = [cfg.toggle, cfg.screen.down, cfg.screen.up, cfg.projector.on, cfg.projector.off, cfg.amplifier]
      return ids.map((id) => s.entities[id])
    }),
  )
  const override = held.useValue('cinema')
  const screenOverride = screenHeld.useValue('screen')
  const projector = switches.useValue('projector')
  const amplifier = switches.useValue('amplifier')
  const now = useClock((s) => s.now)
  if (!cfg) return null

  const toggle = entities[0]
  const on = override?.on ?? toggle?.state === 'on'
  const since = override?.since ?? (on && toggle ? Date.parse(toggle.last_changed) : 0)
  const map = Object.fromEntries([cfg.toggle, cfg.screen.down, cfg.screen.up, cfg.projector.on, cfg.projector.off, cfg.amplifier].map((id, i) => [id, entities[i]!]).filter(([, e]) => e))
  const real = cinemaSteps(cfg, map, litLights)
  const steps = { ...real, projector: projector ?? real.projector, amplifier: amplifier ?? real.amplifier }
  const screen = screenOverride ?? screenState(cfg, map)
  return { status: cinemaStatus(on, since, { ...steps, screenDown: screen.down }, now), steps: { ...steps, screenDown: screen.down }, on, screen }
}

export const cinema = {
  toggle(current: CinemaView) {
    const cfg = config.home.cinema
    if (!cfg) return
    const on = !current.on
    held.hold('cinema', { on, since: on ? Date.now() : 0 }, 4000)
    ha.call(cinemaCall(cfg, on))
  },
  setProjector(on: boolean) {
    const cfg = config.home.cinema
    if (!cfg) return
    switches.hold('projector', on, 8000)
    ha.call(projectorCall(cfg, on))
  },
  setAmplifier(on: boolean) {
    const cfg = config.home.cinema
    if (!cfg) return
    switches.hold('amplifier', on, 2500)
    ha.call(amplifierCall(cfg, on))
  },
  projectorOff: () => cinema.setProjector(false),
  amplifierOff: () => cinema.setAmplifier(false),
  screen(command: 'down' | 'stop' | 'up') {
    const cfg = config.home.cinema
    if (!cfg) return
    if (command !== 'stop') screenHeld.hold('screen', { down: command === 'down', moving: command }, 3000)
    ha.call(screenCall(cfg, command))
  },
}
