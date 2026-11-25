import { gateCall, isMoving, toGate, type Gate } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { createHold } from './hold'
import { useEntity } from './hass.store'

/** "Command sent": remembered with the state it was sent from, so it clears as soon as the gate moves. */
const sent = createHold<string>()

export function useGate(): (Gate & { sent: boolean }) | null {
  const cfg = config.home.gate
  const entity = useEntity(cfg?.entity)
  const sentFrom = sent.useValue('gate')
  if (!cfg) return null
  const gate = toGate(cfg.entity, entity)
  return { ...gate, sent: sentFrom === gate.state }
}

export function pressGate(gate: Gate & { sent: boolean }) {
  if (gate.sent || isMoving(gate) || !gate.available) return
  sent.hold('gate', gate.state, 12000)
  ha.call(gateCall(gate))
}
