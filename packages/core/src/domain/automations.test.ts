import { describe, expect, it } from 'vitest'
import type { PaddockConfig } from '../config/schema'
import { actionFor, activeDays, automatableDevices, automationsFor, automationProblems, isMode, newAutomation, sameAction, sortAutomations, withAction, withDay, type Automation } from './automations'

const config = {
  home: { gate: { entity: 'cover.garage_door', name: 'Garage door', alertAfterMinutes: 10 }, cinema: { amplifier: 'switch.amplifier' }, alerts: { batteries: [], batteryLow: 10 } },
  covers: [{ id: 'living', entity: 'cover.living_room', name: 'Window', group: 'Living room' }],
  lighting: {
    rows: [],
    lights: [{ id: 'desk', entity: 'light.desk', name: 'Desk lamp', room: 'Office', icon: 'table_lamp' }],
    scenes: [{ id: 'relax', entity: 'scene.relax', name: 'Relax', icon: 'wb_twilight' }],
  },
  outdoor: { poolDevice: { entity: 'switch.pool_pump', name: 'Pump', icon: 'valve', on: 'Filtering', off: 'Stopped' }, devices: [] },
} as unknown as PaddockConfig
const groups = { scenes: 'Scenes', outdoor: 'Outdoor', cinema: 'Amplifier', gate: 'Entrance' }

describe('automatableDevices', () => {
  const devices = automatableDevices(config, groups)

  it('offers lights, shutters, scenes, outdoor devices and the amplifier', () => {
    expect(devices.map((d) => [d.entity, d.kind, d.group])).toEqual([
      ['light.desk', 'light', 'Office'],
      ['cover.living_room', 'cover', 'Living room'],
      ['scene.relax', 'scene', 'Scenes'],
      ['switch.pool_pump', 'switch', 'Outdoor'],
      ['switch.amplifier', 'switch', 'Amplifier'],
      ['cover.garage_door', 'gate', 'Entrance'],
    ])
  })

  it('lets an automation close the gate, never open it', () => {
    expect(devices.find((d) => d.kind === 'gate')?.choices).toEqual(['close'])
  })
})

describe('editing', () => {
  const leaving: Automation = { ...newAutomation('mode'), name: 'Leaving' }

  it('starts a mode as a button and a schedule at a time', () => {
    expect(isMode(newAutomation('mode'))).toBe(true)
    expect(newAutomation('schedule').trigger).toEqual({ type: 'time', at: '07:00' })
  })

  it('sets, changes and removes what happens to a device', () => {
    const closed = withAction(leaving, 'cover.living_room', { do: 'close' })
    const ajar = withAction(closed, 'cover.living_room', { do: 'position', value: 20 })
    expect(ajar.actions).toEqual([{ entity: 'cover.living_room', do: 'position', value: 20 }])
    expect(sameAction(actionFor(ajar, 'cover.living_room'), 'position', 20)).toBe(true)
    expect(sameAction(actionFor(ajar, 'cover.living_room'), 'position', 50)).toBe(false)
    expect(withAction(ajar, 'cover.living_room', null).actions).toEqual([])
  })

  it('treats no day and all seven days as every day', () => {
    let trigger = newAutomation('schedule').trigger
    expect(activeDays(trigger)).toHaveLength(7)
    trigger = withDay(trigger, 5)
    expect(activeDays(trigger)).toEqual([5])
    for (const d of [0, 1, 2, 3, 4, 6] as const) trigger = withDay(trigger, d)
    expect(trigger).toEqual({ type: 'time', at: '07:00', days: undefined })
  })

  it('says what is missing before saving', () => {
    expect(automationProblems(newAutomation('mode'))).toEqual(['name', 'actions'])
    const pump: Automation = { ...withAction({ ...newAutomation('schedule'), name: 'Pump' }, 'switch.pool_pump', { do: 'on' }) }
    expect(automationProblems(pump)).toEqual([])
    expect(automationProblems({ ...pump, trigger: { type: 'time', at: '06:00', end: '06:00' } })).toEqual(['end'])
  })
})

describe('automationsFor', () => {
  it('finds the automations that drive a device', () => {
    const pump: Automation = { name: 'Pump', icon: 'valve', enabled: true, trigger: { type: 'time', at: '06:00' }, actions: [{ entity: 'switch.pool_pump', do: 'on' }] }
    const leaving: Automation = { name: 'Leaving', icon: 'logout', enabled: true, trigger: { type: 'manual' }, actions: [{ entity: 'cover.living_room', do: 'close' }] }
    expect(automationsFor([pump, leaving], 'switch.pool_pump')).toEqual([pump])
    expect(automationsFor([pump, leaving], 'light.desk')).toEqual([])
  })
})

describe('sortAutomations', () => {
  it('puts modes first, then schedules by time of day', () => {
    const at = (name: string, trigger: Automation['trigger']): Automation => ({ name, icon: 'bolt', enabled: true, trigger, actions: [] })
    const sorted = sortAutomations([
      at('Evening', { type: 'sun', event: 'sunset', offset: 0 }),
      at('Pump', { type: 'time', at: '06:00' }),
      at('Leaving', { type: 'manual' }),
      at('Night', { type: 'time', at: '23:00' }),
      at('Away', { type: 'presence', event: 'everyone_left' }),
    ])
    expect(sorted.map((a) => a.name)).toEqual(['Leaving', 'Pump', 'Night', 'Evening', 'Away'])
  })
})
