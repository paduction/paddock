import { create } from 'zustand'
import { playCall, tvCommandCall, type Movie, type MovieSheet, type MoviesView } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { useUi } from './ui.store'

interface MoviesState {
  section: string
  view: MoviesView
  sections: string[]
  items: Movie[]
  loading: boolean
  error: boolean
  loadedAt: number
  /** Movie sheet open (summary at once, full sheet when loaded). */
  open: Movie | null
  sheet: MovieSheet | null
  /** Index in config.movies.tvs */
  tv: number
  sentAt: number
  /** TV whose full-screen remote is open, or null. */
  remote: number | null
}

const DEFAULT_SECTIONS = ['Films', 'Animation', 'Séries TV']

export const useMovies = create<MoviesState>()(() => ({
  section: 'Films',
  view: 'recent',
  sections: DEFAULT_SECTIONS,
  items: [],
  loading: false,
  error: false,
  loadedAt: 0,
  open: null,
  sheet: null,
  tv: 0,
  sentAt: 0,
  remote: null,
}))

const server = () => config.movies?.server.replace(/\/$/, '') ?? ''

export const movies = {
  /** Loads the library; `patch` switches section or view. */
  async load(patch: Partial<Pick<MoviesState, 'section' | 'view'>> = {}) {
    if (!config.movies) return
    useMovies.setState({ ...patch, ...(Object.keys(patch).length ? { items: [] } : {}), loading: true, error: false })
    const { section, view } = useMovies.getState()
    try {
      const r = await fetch(`${server()}/library?section=${encodeURIComponent(section)}&view=${view}&limit=60`, { cache: 'no-store' })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      useMovies.setState((s) => ({
        items: d.items ?? [],
        sections: d.sections?.length ? d.sections.map((x: { title: string }) => x.title) : s.sections,
        loading: false,
        loadedAt: Date.now(),
      }))
    } catch (error) {
      console.warn('[paddock] plex', error)
      useMovies.setState({ loading: false, error: true })
    }
  },

  /** Reloads when entering the tab, at most every 2 minutes. */
  refresh() {
    if (Date.now() - useMovies.getState().loadedAt > 120e3) movies.load()
  },

  async openSheet(movie: Movie) {
    useMovies.setState({ open: movie, sheet: null, sentAt: 0 })
    useUi.getState().touched()
    try {
      const d = await (await fetch(`${server()}/item/${movie.key}`, { cache: 'no-store' })).json()
      if (useMovies.getState().open === movie && !d.error) useMovies.setState({ sheet: d })
    } catch (error) {
      console.warn('[paddock] plex sheet', error)
    }
  },

  closeSheet: () => useMovies.setState({ open: null, sheet: null }),
  chooseTv: (tv: number) => useMovies.setState({ tv }),

  /** Opens the movie in Plex on the chosen TV, then shows the tablet remote. */
  play() {
    const cfg = config.movies
    const s = useMovies.getState()
    const movie = s.sheet ?? s.open
    if (!cfg || !movie || Date.now() - s.sentAt < 40e3) return
    const tv = cfg.tvs[s.tv] ? s.tv : 0
    useMovies.setState({ sentAt: Date.now() })
    ha.call(playCall(cfg, movie, s.section, cfg.tvs[tv]))
    setTimeout(() => useMovies.setState({ open: null, sheet: null, remote: tv }), 700)
  },

  openRemote: () => useMovies.setState((s) => ({ remote: config.movies?.tvs[s.tv] ? s.tv : 0 })),
  closeRemote: () => useMovies.setState({ remote: null }),

  key(command: string, repeat = 1) {
    const tv = config.movies?.tvs[useMovies.getState().remote ?? -1]
    if (!tv) return
    useUi.getState().touched()
    ha.call(tvCommandCall(tv, command, repeat))
  },
}
