import { describe, expect, it } from 'vitest'
import { buildAlerts } from './alerts'
import { cinemaStatus } from './cinema'
import { clampTarget, isHeating, steppedPreset, toThermostat } from './climate'
import { gateCall, minutesOpen, toGate } from './gate'
import type { HassEntity } from '../ha/types'

const e = (state: string, attributes: Record<string, unknown> = {}, last_changed = '2026-11-21T10:00:00Z') =>
  ({ entity_id: 'x', state, attributes, last_changed, last_updated: last_changed }) as HassEntity

describe('thermostat', () => {
  it('uses presets when there is no target temperature', () => {
    const t = toThermostat(e('heat', { supported_features: 400, preset_modes: ['comfort', 'eco', 'away', 'boost'], preset_mode: 'comfort' }))
    expect(t.usesPresets).toBe(true)
    expect(steppedPreset(t, 1)).toBe('boost')
    expect(steppedPreset(t, -1)).toBe('eco')
  })

  it('clamps the target to the ruler and half degrees', () => {
    const t = toThermostat(e('heat', { supported_features: 1, temperature: 20, min_temp: 7, max_temp: 35 }))
    expect(clampTarget(t, 20.26)).toBe(20.5)
    expect(clampTarget(t, 40)).toBe(26)
  })

  it('heats when below target if the thermostat does not report its action', () => {
    expect(isHeating(toThermostat(e('heat', { supported_features: 1, temperature: 21, current_temperature: 19 })))).toBe(true)
    expect(isHeating(toThermostat(e('off', { temperature: 21, current_temperature: 19 })))).toBe(false)
  })
})

describe('gate', () => {
  it('counts minutes open and toggles with the right service', () => {
    const g = toGate('cover.gate', e('open', {}, '2026-11-21T10:00:00Z'))
    expect(minutesOpen(g, Date.parse('2026-11-21T10:19:30Z'))).toBe(19)
    expect(gateCall(g).service).toBe('close_cover')
  })
})

describe('alerts', () => {
  it('lists gate first, then people, then the rest', () => {
    const alerts = buildAlerts({
      entities: { 'binary_sensor.cam': e('on'), 'sensor.bat': e('8', { friendly_name: 'Thermo Batterie' }) },
      config: { batteries: ['sensor.bat'], batteryLow: 10, people: [{ name: 'Backyard', sensor: 'binary_sensor.cam' }] },
      offline: [],
      gateOpenMinutes: 19,
      gateAlertAfter: 10,
    })
    expect(alerts).toEqual([
      { kind: 'gate-open', minutes: 19 },
      { kind: 'person', camera: 'Backyard' },
      { kind: 'battery', name: 'Thermo', percent: 8 },
    ])
  })
})

describe('cinema', () => {
  it('is starting until every step is done, at most 45 s', () => {
    const steps = { dimmed: true, screenDown: false, projector: true, amplifier: true }
    expect(cinemaStatus(true, 0, steps, 10e3)).toBe('starting')
    expect(cinemaStatus(true, 0, steps, 50e3)).toBe('on')
    expect(cinemaStatus(false, 0, steps, 0)).toBe('off')
  })
})
