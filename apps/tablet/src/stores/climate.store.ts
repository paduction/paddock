import { useRef } from 'react'
import { clampTarget, hvacModeCall, presetCall, steppedPreset, temperatureCall, toThermostat, type Thermostat } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { createHold } from './hold'
import { useEntity } from './hass.store'

const held = createHold<string | number>()
let sendTimer: ReturnType<typeof setTimeout>

/** The thermostat of the Home page, with the user's pending changes applied. */
export function useThermostat(): Thermostat | null {
  const cfg = config.home.climate
  const entity = useEntity(cfg?.entity)
  const sensor = useEntity(cfg?.temperatureSensor)
  const target = held.useValue('target') as number | undefined
  const mode = held.useValue('mode') as string | undefined
  const preset = held.useValue('preset') as string | undefined
  const last = useRef(19)
  if (!cfg) return null
  const t = toThermostat(entity, sensor, last.current)
  last.current = t.target
  return { ...t, target: target ?? t.target, mode: mode ?? t.mode, preset: preset ?? t.preset }
}

export const climate = {
  /** Ruler and +/- : the screen follows at once, Home Assistant gets the value 0.6 s after the last change. */
  setTarget(t: Thermostat, value: number) {
    const cfg = config.home.climate
    const target = clampTarget(t, value)
    if (!cfg || target === t.target) return
    held.hold('target', target, 4000)
    clearTimeout(sendTimer)
    sendTimer = setTimeout(() => ha.call(temperatureCall(cfg.entity, target)), 600)
  },
  setMode(mode: string) {
    const cfg = config.home.climate
    if (!cfg) return
    held.hold('mode', mode, 4000)
    ha.call(hvacModeCall(cfg.entity, mode))
  },
  setPreset(t: Thermostat, preset: string | null) {
    const cfg = config.home.climate
    if (!cfg || !preset || preset === t.preset) return
    held.hold('preset', preset, 5000)
    ha.call(presetCall(cfg.entity, preset))
  },
  step(t: Thermostat, direction: 1 | -1) {
    if (t.usesPresets) climate.setPreset(t, steppedPreset(t, direction))
    else climate.setTarget(t, t.target + direction * 0.5)
  },
}
