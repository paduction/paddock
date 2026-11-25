import type { MoviesConfig, TvConfig } from '../config/schema'
import type { HassEntity, ServiceCall } from '../ha/types'

/** Item of the plex-info library list. */
export interface Movie {
  key: string
  title: string
  year?: number
  library?: string
  durationMin?: number
  rating?: number
  contentRating?: string
  genres: string[]
  summary: string
  viewed: boolean
  /** 0–1 */
  progress: number
  poster?: string
  backdrop?: string
}

/** Full sheet (plex-info /item/:key). */
export interface MovieSheet extends Movie {
  studio?: string
  directors?: string[]
  countries?: string[]
  cast?: { name: string; role?: string; photo?: string }[]
}

export type MoviesView = 'recent' | 'unwatched' | 'ondeck'

/** 95 → "1 h 35", 40 → "40 min" */
export function duration(minutes?: number): string {
  if (!minutes) return ''
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`
}

/** Minutes left when the movie was started (> 2 %). */
export function remainingMinutes(m: Movie): number {
  return m.durationMin && m.progress > 0.02 ? Math.round(m.durationMin * (1 - m.progress)) : 0
}

/** Relative image paths from plex-info → absolute URLs. */
export function imageUrl(server: string, path?: string): string {
  if (!path) return ''
  return path.startsWith('/') ? server.replace(/\/$/, '') + path : path
}

/** TVs that exist in Home Assistant (a config entry without entity is skipped). */
export function availableTvs(cfg: MoviesConfig, entities: Record<string, HassEntity | undefined>): number[] {
  return cfg.tvs.map((_, i) => i).filter((i) => !!entities[cfg.tvs[i].media])
}

export function playCall(cfg: MoviesConfig, movie: Movie, section: string, tv: TvConfig): ServiceCall {
  return {
    domain: 'script',
    service: 'turn_on',
    target: cfg.playScript,
    data: { variables: { title: movie.title, library: movie.library || section, resume: movie.progress > 0.02, tv: tv.media, room: tv.plexKeyword } },
  }
}

/** Apple TV remote command; `repeat` > 1 sends it several times (long swipes). */
export function tvCommandCall(tv: TvConfig, command: string, repeat = 1): ServiceCall {
  return { domain: 'remote', service: 'send_command', target: tv.remote, data: { command: repeat > 1 ? Array(repeat).fill(command) : command, delay_secs: 0.12 } }
}
