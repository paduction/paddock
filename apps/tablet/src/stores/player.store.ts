import { isOn, nextCall, playPauseCall, previousCall, toPlayer, turnOnCall, volumeCall, type Player } from '@paddock/core'
import { ha } from '../ha'
import { useEntity } from './hass.store'
import { createHold } from './hold'

/** Volume shown right after a + / − press. */
const volume = createHold<number>()

/** Any media player, with the pending volume applied. */
export function usePlayer(entity: string | undefined): Player | null {
  const state = useEntity(entity)
  const held = volume.useValue(entity ?? '')
  if (!entity) return null
  const player = toPlayer(entity, state)
  return held === undefined ? player : { ...player, volume: held }
}

export const players = {
  playPause: (p: Player) => ha.call(isOn(p) ? playPauseCall(p) : turnOnCall(p)),
  previous: (p: Player) => ha.call(previousCall(p)),
  next: (p: Player) => ha.call(nextCall(p)),
  changeVolume(p: Player, delta: number) {
    const level = Math.max(0, Math.min(100, p.volume + delta))
    volume.hold(p.entity, level, 2500)
    ha.call(volumeCall(p, level))
  },
}
