import { useShallow } from 'zustand/react/shallow'
import type { DeviceConfig } from '@paddock/core'
import { ha } from '../ha'
import { useHass } from './hass.store'
import { createHold } from './hold'

const held = createHold<boolean>()

/** On/off state of simple devices (switches, plugs), with the pending change applied. */
export function useDevices(devices: DeviceConfig[]): boolean[] {
  const states = useHass(useShallow((s) => devices.map((d) => s.entities[d.entity]?.state === 'on')))
  const overrides = held.useAll()
  return devices.map((d, i) => (overrides[d.entity] as boolean | undefined) ?? states[i])
}

export function toggleDevice(device: DeviceConfig, on: boolean) {
  held.hold(device.entity, !on, 2500)
  ha.call({ domain: 'homeassistant', service: on ? 'turn_off' : 'turn_on', target: device.entity })
}
