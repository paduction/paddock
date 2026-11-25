import type { GamingConfig } from '../config/schema'
import { numericState, UNKNOWN_STATES, type HassEntity, type ServiceCall } from '../ha/types'

export type OnlineStatus = 'online' | 'away' | 'app' | 'offline'

export interface GameConsole {
  /** awake / rest mode, from the power switch, or guessed from the account */
  power: 'on' | 'standby' | 'unknown'
  status: OnlineStatus | null
  /** Game being played right now */
  game: { title: string; picture: string | null; since: number | null } | null
  onlineId: string
  avatar: string | null
  level: number | null
  plus: boolean
  lastOnline: number | null
}

const known = (e?: HassEntity) => !!e && !UNKNOWN_STATES.includes(e.state)

/** PlayStation Network status → online / away / app / offline. */
export function onlineStatus(e?: HassEntity): OnlineStatus | null {
  if (!known(e)) return null
  const s = e!.state.toLowerCase()
  if (s.includes('app')) return 'app'
  if (s.includes('away') || s.includes('busy')) return 'away'
  if (s.startsWith('online')) return 'online'
  return 'offline'
}

export interface GamingEntities {
  console?: HassEntity
  power?: HassEntity
  status?: HassEntity
  lastOnline?: HassEntity
  nowPlaying?: HassEntity
  trophyLevel?: HassEntity
  onlineId?: HassEntity
  avatar?: HassEntity
  plus?: HassEntity
}

export function toConsole(e: GamingEntities): GameConsole {
  const media = e.console
  const status = onlineStatus(e.status)
  const titleFromSensor = known(e.nowPlaying) ? e.nowPlaying!.state : ''
  const title = (media?.attributes.media_title as string | undefined) || titleFromSensor
  const playing = !!title && (media?.state === 'playing' || (!media && status === 'online'))
  const power: GameConsole['power'] = known(e.power)
    ? e.power!.state === 'on' ? 'on' : 'standby'
    : media && ['on', 'playing', 'idle', 'paused'].includes(media.state) ? 'on'
    : status ? 'standby' : 'unknown'
  return {
    power,
    status,
    game: playing ? { title, picture: (media?.attributes.entity_picture as string | undefined) ?? null, since: media?.last_changed ? Date.parse(media.last_changed) : null } : null,
    onlineId: known(e.onlineId) ? e.onlineId!.state : '',
    avatar: (e.avatar?.attributes.entity_picture as string | undefined) ?? null,
    level: numericState(e.trophyLevel),
    plus: e.plus?.state === 'on',
    lastOnline: known(e.lastOnline) ? Date.parse(e.lastOnline!.state) || null : null,
  }
}

const NOT_A_GAME = new Set(['', 'unknown', 'unavailable', 'none', 'null'])

/** Last game in the "now playing" history: [time ms, state] sorted by time. `end` = when it stopped. */
export function lastGame(history: [number, string][]): { title: string; end: number | null } | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const title = history[i][1]?.trim() ?? ''
    if (NOT_A_GAME.has(title.toLowerCase())) continue
    return { title, end: i + 1 < history.length ? history[i + 1][0] : null }
  }
  return null
}

export const consolePowerCall = (cfg: GamingConfig, on: boolean): ServiceCall | null =>
  cfg.power ? { domain: 'switch', service: on ? 'turn_on' : 'turn_off', target: cfg.power } : null

/* ---------- Play sessions (from the "now playing" history) ---------- */

export interface GameSession {
  title: string
  start: number
  /** null = still playing */
  end: number | null
}

/** Sessions from the "now playing" history: [time ms, state] sorted by time. Short blips (< 1 min) are dropped, the same game resumed within 10 min is merged. */
export function gameSessions(history: [number, string][]): GameSession[] {
  const out: GameSession[] = []
  for (let i = 0; i < history.length; i++) {
    const title = history[i][1]?.trim() ?? ''
    if (NOT_A_GAME.has(title.toLowerCase())) continue
    const start = history[i][0]
    const end = i + 1 < history.length ? history[i + 1][0] : null
    if (end !== null && end - start < 60e3) continue
    const prev = out[out.length - 1]
    if (prev && prev.title === title && prev.end !== null && start - prev.end < 10 * 60e3) prev.end = end
    else out.push({ title, start, end })
  }
  return out
}

const duration = (s: GameSession, now: number) => (s.end ?? now) - s.start

/** Time played (ms) since `from`. */
export function playtime(sessions: GameSession[], from: number, now: number, title?: string): number {
  let total = 0
  for (const s of sessions) {
    if (title && s.title !== title) continue
    const start = Math.max(s.start, from)
    const end = Math.min(s.end ?? now, now)
    if (end > start) total += end - start
  }
  return total
}

/** Most played games since `from`, longest first. */
export function topGames(sessions: GameSession[], from: number, now: number, limit = 5): { title: string; ms: number }[] {
  const by = new Map<string, number>()
  for (const s of sessions) by.set(s.title, (by.get(s.title) ?? 0) + Math.max(0, Math.min(s.end ?? now, now) - Math.max(s.start, from)))
  return [...by.entries()].filter(([, ms]) => ms > 0).map(([title, ms]) => ({ title, ms })).sort((a, b) => b.ms - a.ms).slice(0, limit)
}

export const sessionDuration = duration
