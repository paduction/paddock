import type { SpeakerConfig } from '../config/schema'
import type { HassEntity, ServiceCall } from '../ha/types'
import type { Player } from './media'

export interface Track {
  id: string
  title: string
  type: string
  thumb: string | null
}

export interface Playlist {
  title: string
  uri: string
  items: Track[]
}

/** Music Assistant's generated playlists, hidden from the picker. */
const AUTOMATIC = ['500 random tracks', 'all favorited tracks', 'infinite mix', 'random album', 'random artist', 'recently added tracks', 'recently played tracks']

export const isUserPlaylist = (title: string) => !!title && !AUTOMATIC.some((a) => title.toLowerCase().startsWith(a))

/** YouTube Music titles are "Artist - Title": split for display. */
export function splitTrackTitle(title: string): { artist: string; title: string } {
  const i = title.indexOf(' - ')
  return i > 0 ? { artist: title.slice(0, i), title: title.slice(i + 3) } : { artist: '', title }
}

/** Is this playlist entry the track playing now? */
export function isCurrentTrack(track: Track, playing: Player): boolean {
  return !!playing.title && (track.title === playing.title || track.title.toLowerCase().includes(playing.title.toLowerCase()))
}

export type Repeat = 'off' | 'all' | 'one'
export const nextRepeat = (r: Repeat): Repeat => ({ off: 'all', all: 'one', one: 'off' } as const)[r] ?? 'off'

export interface Speaker extends SpeakerConfig {
  available: boolean
  state: string
  group: string[]
}

export function toSpeaker(cfg: SpeakerConfig, e?: HassEntity): Speaker {
  return { ...cfg, available: !!e && e.state !== 'unavailable', state: e?.state ?? 'unavailable', group: e?.attributes.group_members ?? [] }
}

/** Members to join before playing, or null when the group is already formed. */
export function joinCall(s: Speaker): ServiceCall | null {
  const members = s.members ?? []
  if (!members.length || members.every((m) => s.group.includes(m))) return null
  return { domain: 'media_player', service: 'join', target: s.entity, data: { group_members: members } }
}

export const seekCall = (p: Player, seconds: number): ServiceCall => ({ domain: 'media_player', service: 'media_seek', target: p.entity, data: { seek_position: seconds } })
export const shuffleCall = (p: Player, shuffle: boolean): ServiceCall => ({ domain: 'media_player', service: 'shuffle_set', target: p.entity, data: { shuffle } })
export const repeatCall = (p: Player, repeat: Repeat): ServiceCall => ({ domain: 'media_player', service: 'repeat_set', target: p.entity, data: { repeat } })
export const powerCall = (p: Player, on: boolean): ServiceCall => ({ domain: 'media_player', service: on ? 'turn_on' : 'turn_off', target: p.entity })

/** Plays `tracks` (from the chosen one to the end of the playlist) with Music Assistant. */
export const playTracksCall = (entity: string, tracks: Track[]): ServiceCall => ({ domain: 'music_assistant', service: 'play_media', target: entity, data: { media_id: tracks.map((t) => t.id), enqueue: 'replace' } })
export const playTrackFallbackCall = (entity: string, t: Track): ServiceCall => ({ domain: 'media_player', service: 'play_media', target: entity, data: { media_content_id: t.id, media_content_type: t.type } })
export const transferCall = (to: string, from: string): ServiceCall => ({ domain: 'music_assistant', service: 'transfer_queue', target: to, data: { source_player: from, auto_play: true } })
