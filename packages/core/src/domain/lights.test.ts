import { describe, expect, it } from 'vitest'
import { allOffCall, brightnessCall, countLit, displayedLevel, toLight } from './lights'
import type { HassEntity } from '../ha/types'

const cfg = { id: 'desk', entity: 'light.desk', name: 'Desk', room: 'Office', icon: 'table_lamp' }
const entity = (state: string, attributes: Record<string, unknown> = {}) =>
  ({ entity_id: 'light.desk', state, attributes, last_changed: '', last_updated: '' }) as HassEntity

describe('lights', () => {
  it('converts HA brightness (0–255) to percent', () => {
    expect(toLight(cfg, entity('on', { brightness: 128 })).brightness).toBe(50)
  })

  it('remembers the last brightness while off', () => {
    const before = toLight(cfg, entity('on', { brightness: 230 }))
    const after = toLight(cfg, entity('off'), before)
    expect(after.brightness).toBe(90)
    expect(displayedLevel(after)).toBe(0)
  })

  it('treats an unavailable entity as offline and not lit', () => {
    const light = toLight(cfg, entity('unavailable'))
    expect(light.available).toBe(false)
    expect(countLit([light])).toBe(0)
  })

  it('turns the light off at 0 % and caps at 100 %', () => {
    const light = toLight(cfg, entity('on', { brightness: 200 }))
    expect(brightnessCall(light, 0).service).toBe('turn_off')
    expect(brightnessCall(light, 0.4).data).toEqual({ brightness_pct: 1 })
    expect(brightnessCall(light, 140).data).toEqual({ brightness_pct: 100 })
  })

  it('turns off only the lights that are lit', () => {
    const on = toLight(cfg, entity('on', { brightness: 255 }))
    const off = toLight({ ...cfg, id: 'b', entity: 'light.b' }, entity('off'))
    expect(allOffCall([on, off])?.target).toEqual(['light.desk'])
    expect(allOffCall([off])).toBeNull()
  })
})
