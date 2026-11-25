import type { CinemaConfig } from '../config/schema'
import type { HassEntities, ServiceCall } from '../ha/types'

export interface CinemaSteps {
  dimmed: boolean
  screenDown: boolean
  projector: boolean
  amplifier: boolean
}

const lastTriggered = (e?: { attributes: Record<string, any> }) => (e?.attributes.last_triggered ? Date.parse(e.attributes.last_triggered) : 0)

/** Projector and screen are scripts: the last one triggered tells the state. */
export function cinemaSteps(cfg: CinemaConfig, entities: HassEntities, litLights: string[]): CinemaSteps {
  return {
    dimmed: cfg.dimLights.every((id) => !litLights.includes(id)),
    screenDown: lastTriggered(entities[cfg.screen.down]) > lastTriggered(entities[cfg.screen.up]),
    projector: lastTriggered(entities[cfg.projector.on]) > lastTriggered(entities[cfg.projector.off]),
    amplifier: entities[cfg.amplifier]?.state === 'on',
  }
}

export type CinemaStatus = 'off' | 'starting' | 'on'

/** "on" once every step is done (or after 45 s, steps may not report). */
export function cinemaStatus(toggleOn: boolean, since: number, steps: CinemaSteps, now: number): CinemaStatus {
  if (!toggleOn) return 'off'
  const done = Object.values(steps).every(Boolean)
  return done || now - since > 45e3 ? 'on' : 'starting'
}

export const cinemaCall = (cfg: CinemaConfig, on: boolean): ServiceCall => ({ domain: 'input_boolean', service: on ? 'turn_on' : 'turn_off', target: cfg.toggle })
export const projectorCall = (cfg: CinemaConfig, on: boolean): ServiceCall => ({ domain: 'script', service: 'turn_on', target: on ? cfg.projector.on : cfg.projector.off })
export const amplifierCall = (cfg: CinemaConfig, on: boolean): ServiceCall => ({ domain: 'homeassistant', service: on ? 'turn_on' : 'turn_off', target: cfg.amplifier })
export const pauseCall = (entity: string): ServiceCall => ({ domain: 'media_player', service: 'media_pause', target: entity })

/** Screen: the last script triggered tells where it is; a running script means it is moving. */
export function screenState(cfg: CinemaConfig, entities: HassEntities): { down: boolean; moving: 'down' | 'up' | null } {
  const down = entities[cfg.screen.down]
  const up = entities[cfg.screen.up]
  return {
    down: lastTriggered(down) > lastTriggered(up),
    moving: down?.state === 'on' ? 'down' : up?.state === 'on' ? 'up' : null,
  }
}

export function screenCall(cfg: CinemaConfig, command: 'down' | 'stop' | 'up'): ServiceCall {
  if (command === 'stop') return { domain: 'script', service: 'turn_off', target: [cfg.screen.down, cfg.screen.up] }
  return { domain: 'script', service: 'turn_on', target: command === 'down' ? cfg.screen.down : cfg.screen.up }
}

/** Apple TV remote commands (remote.send_command). */
const REMOTE_COMMANDS: Record<string, string> = { up: 'up', down: 'down', left: 'left', right: 'right', ok: 'select', back: 'menu', home: 'home', vdown: 'volume_down', vup: 'volume_up' }

export function remoteKeyCall(player: { media: string; remote: string }, key: string): ServiceCall | null {
  if (key === 'power') return { domain: 'remote', service: 'toggle', target: player.remote }
  if (key === 'mute') return { domain: 'media_player', service: 'volume_mute', target: player.media, data: { is_volume_muted: true } }
  const command = REMOTE_COMMANDS[key]
  return command ? { domain: 'remote', service: 'send_command', target: player.remote, data: { command } } : null
}
