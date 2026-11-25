import type { HassEntity, ServiceCall } from '../ha/types'

export interface Player {
  entity: string
  /** friendly_name */
  name: string
  state: string
  album: string
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  /** 0–100 */
  volume: number
  title: string
  artist: string
  /** App shown on a TV (Netflix, Plex…) */
  app: string
  /** Seconds. */
  duration: number
  position: number
  positionAt: number
  picture: string | null
}

/** Some apps report their bundle id as title: treat it as "no title". */
function realTitle(a: Record<string, any>): string {
  const t = String(a.media_title || '').trim()
  return !t || t === a.app_id || /^(com|net|org|io)\.[\w.-]+$/.test(t) ? '' : t
}

export function toPlayer(entity: string, e?: HassEntity): Player {
  const a = e?.attributes ?? {}
  return {
    entity,
    name: a.friendly_name || entity,
    state: e?.state ?? 'unavailable',
    album: a.media_album_name || '',
    shuffle: !!a.shuffle,
    repeat: a.repeat || 'off',
    volume: Math.round((a.volume_level ?? 0) * 100),
    title: realTitle(a),
    artist: a.media_artist || '',
    app: a.app_name || '',
    duration: a.media_duration || 0,
    position: a.media_position || 0,
    positionAt: a.media_position_updated_at ? Date.parse(a.media_position_updated_at) : Date.now(),
    picture: a.entity_picture || null,
  }
}

export function isActive(p: Player): boolean {
  return !!p.title && (p.state === 'playing' || p.state === 'paused')
}

/** Current playback position in seconds, extrapolated while playing. */
export function livePosition(p: Player, now: number): number {
  if (!p.duration) return 0
  const elapsed = p.state === 'playing' ? (now - p.positionAt) / 1000 : 0
  return Math.max(0, Math.min(p.duration, p.position + elapsed))
}

export const playPauseCall = (p: Player): ServiceCall => ({ domain: 'media_player', service: 'media_play_pause', target: p.entity })
export const stopCall = (p: Player): ServiceCall => ({ domain: 'media_player', service: 'media_stop', target: p.entity })

/** The device is on (playing, paused, idle…). */
export function isOn(p: Player): boolean {
  return !['off', 'unavailable', 'unknown', 'standby'].includes(p.state)
}

export const turnOnCall = (p: Player): ServiceCall => ({ domain: 'media_player', service: 'turn_on', target: p.entity })
export const previousCall = (p: Player): ServiceCall => ({ domain: 'media_player', service: 'media_previous_track', target: p.entity })
export const nextCall = (p: Player): ServiceCall => ({ domain: 'media_player', service: 'media_next_track', target: p.entity })
export const volumeCall = (p: Player, volume: number): ServiceCall => ({ domain: 'media_player', service: 'volume_set', target: p.entity, data: { volume_level: Math.max(0, Math.min(100, volume)) / 100 } })
