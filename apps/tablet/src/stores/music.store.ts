import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import {
  hasStarted,
  isActive,
  isOn,
  isUserPlaylist,
  joinCall,
  nextCall,
  nextRepeat,
  pauseCall,
  playPauseCall,
  playTrackFallbackCall,
  playTracksCall,
  powerCall,
  previousCall,
  repeatCall,
  seekCall,
  shuffleCall,
  stopCall,
  toPlayer,
  toSpeaker,
  transferCall,
  volumeCall,
  type Player,
  type Playlist,
  type Speaker,
  type Track,
} from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { useHass } from './hass.store'
import { createHold } from './hold'
import { useUi } from './ui.store'

interface MusicState {
  /** Selected speaker (Music Assistant player). */
  speaker: string
  playlists: string[]
  playlistName: string | null
  playlist: Playlist | null
  pickerOpen: boolean
  /** Track just asked for, until the speaker reports it. */
  pending: { id: string; title: string; at: number } | null
  /** Track that could not be played: refused by the music service, or never started. */
  failed: { id: string; title: string; at: number } | null
  /** Mini player hidden for a moment after "stop". */
  hiddenUntil: number
}

export const useMusic = create<MusicState>()(() => ({
  speaker: config.music?.player ?? '',
  playlists: [],
  playlistName: null,
  playlist: null,
  pickerOpen: false,
  pending: null,
  failed: null,
  hiddenUntil: 0,
}))

/** How long a track may take to start before it counts as failed (the music service tries several tracks first). */
export const START_WINDOW = 30e3

/** Local values shown at once (volume, connecting) before the speaker reports them. */
const held = createHold<number | boolean>()

/** The selected speaker, with pending volume / connecting state applied. */
export function useCurrentPlayer(): (Player & { connecting: boolean }) | null {
  const entity = useMusic((s) => s.speaker)
  const state = useHass((s) => (entity ? s.entities[entity] : undefined))
  const volume = held.useValue('volume') as number | undefined
  const connecting = held.useValue('connecting') as boolean | undefined
  if (!entity) return null
  const player = toPlayer(entity, state)
  return { ...player, volume: volume ?? player.volume, connecting: !!connecting && !isOn(player) }
}

export function useSpeakers(): Speaker[] {
  const list = config.music?.speakers ?? []
  const entities = useHass(useShallow((s) => list.map((x) => s.entities[x.entity])))
  return list.map((cfg, i) => toSpeaker(cfg, entities[i]))
}

/** Sidebar mini player: the selected speaker when something plays. */
export function useMusicPlayer(): { player: Player | null; visible: boolean } {
  const player = useCurrentPlayer()
  const hidden = useMusic((s) => s.hiddenUntil > 0)
  return { player, visible: !!player && isActive(player) && !hidden }
}

async function ensureGroup(entity: string) {
  const speaker = (config.music?.speakers ?? []).find((s) => s.entity === entity)
  if (!speaker) return
  const call = joinCall(toSpeaker(speaker, useHass.getState().entities[entity]))
  if (call) await ha.call(call)
}

async function loadPlaylist() {
  const s = useMusic.getState()
  const name = (s.playlistName ?? config.music?.playlist ?? '').toLowerCase()
  if (!name || !s.speaker) return
  try {
    type Browse = { title?: string; children?: { title?: string; media_content_id: string; media_content_type?: string; thumbnail?: string; can_play?: boolean }[] }
    const all = await ha.command<Browse>({ type: 'media_player/browse_media', entity_id: s.speaker, media_content_id: 'playlists', media_content_type: 'playlists' })
    const children = all?.children ?? []
    useMusic.setState({ playlists: children.map((c) => c.title ?? '').filter(isUserPlaylist) })
    const found = children.find((c) => (c.title ?? '').trim().toLowerCase() === name)
    if (!found) return useMusic.setState({ playlist: null })
    const r = await ha.command<Browse>({ type: 'media_player/browse_media', entity_id: s.speaker, media_content_id: found.media_content_id, media_content_type: found.media_content_type || 'playlist' })
    const items: Track[] = (r?.children ?? [])
      .filter((c) => c.can_play !== false)
      .slice(0, 60)
      .map((c) => ({ title: c.title ?? '', id: c.media_content_id, type: c.media_content_type ?? 'track', thumb: c.thumbnail ?? null }))
    useMusic.setState({ playlist: { title: r?.title || 'Playlist', uri: found.media_content_id, items } })
  } catch (error) {
    console.warn('[paddock] playlist', error)
  }
}

let started = false
ha.onStatus((status) => {
  if (status !== 'live' || started || !config.music) return
  started = true
  loadPlaylist()
  setInterval(loadPlaylist, 10 * 60e3)
})

export const music = {
  loadPlaylist,

  async playTrack(track: Track) {
    const s = useMusic.getState()
    const at = Date.now()
    useMusic.setState({ pending: { id: track.id, title: track.title, at }, failed: null })
    useUi.getState().touched()
    // only the latest request may report a failure
    const fail = () => {
      if (useMusic.getState().pending?.at === at) useMusic.setState({ pending: null, failed: { id: track.id, title: track.title, at: Date.now() } })
    }
    await ensureGroup(s.speaker)
    const items = s.playlist?.items ?? [track]
    const from = Math.max(0, items.indexOf(track))
    const accepted = (await ha.call(playTracksCall(s.speaker, items.slice(from)))) || (await ha.call(playTrackFallbackCall(s.speaker, track)))
    if (!accepted) return fail()
    // Accepted is not playing: the service can still give up on every track. Check that the speaker really started.
    setTimeout(() => {
      const now = useMusic.getState()
      if (now.pending?.at !== at) return
      if (hasStarted(track, toPlayer(now.speaker, useHass.getState().entities[now.speaker]))) useMusic.setState({ pending: null })
      else fail()
    }, Math.max(0, at + START_WINDOW - Date.now()))
  },

  /** ▶: plays the first playlist track when nothing is loaded, turns the speaker on, or toggles play/pause. */
  play(p: Player) {
    const first = useMusic.getState().playlist?.items[0]
    if ((!isOn(p) || !p.title) && first) return music.playTrack(first)
    if (!isOn(p)) return music.power(p)
    if (!['playing', 'paused'].includes(p.state) && first) return music.playTrack(first)
    ha.call(playPauseCall(p))
  },

  power(p: Player) {
    if (isOn(p)) return ha.call(powerCall(p, false))
    held.hold('connecting', true, 10000)
    ha.call(powerCall(p, true))
  },

  async pickSpeaker(entity: string, current: Player) {
    if (entity === current.entity) return
    useMusic.setState({ speaker: entity })
    useUi.getState().touched()
    await ensureGroup(entity)
    if (current.state === 'playing') ha.call(transferCall(entity, current.entity))
  },

  pickPlaylist(name: string) {
    useMusic.setState({ playlistName: name, pickerOpen: false, playlist: null })
    loadPlaylist()
  },
  togglePicker: () => {
    useMusic.setState((s) => ({ pickerOpen: !s.pickerOpen }))
    useUi.getState().touched()
  },

  previous: (p: Player) => ha.call(previousCall(p)),
  next: (p: Player) => ha.call(nextCall(p)),
  shuffle: (p: Player) => ha.call(shuffleCall(p, !p.shuffle)),
  repeat: (p: Player) => ha.call(repeatCall(p, nextRepeat(p.repeat))),
  seek: (p: Player, seconds: number) => ha.call(seekCall(p, seconds)),
  setVolume(p: Player, volume: number) {
    const v = Math.max(0, Math.min(100, Math.round(volume)))
    held.hold('volume', v, 2500)
    ha.call(volumeCall(p, v))
  },
  changeVolume: (p: Player, delta: number) => music.setVolume(p, p.volume + delta),

  /** Mini player */
  playPause: (p: Player) => ha.call(playPauseCall(p)),
  pause: (p: Player) => ha.call(pauseCall(p.entity)),
  stop(p: Player) {
    useMusic.setState({ hiddenUntil: Date.now() + 6000 })
    setTimeout(() => useMusic.setState({ hiddenUntil: 0 }), 6000)
    useUi.getState().touched()
    ha.call(stopCall(p))
  },
}
