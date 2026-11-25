import { create } from 'zustand'
import { shelfQueries, toListedGames, type ListedGame } from '@paddock/core'
import { config } from '../config'

/** Upcoming and best rated PS5 games (RAWG), refreshed twice a day, kept on the tablet. */
interface Shelves {
  upcoming: ListedGame[] | null
  bestRated: ListedGame[] | null
  at: number
  error: boolean
}
const KEY = 'paddock.shelves.v3'
const FRESH = 12 * 3600e3

function read(): Shelves {
  try {
    return { upcoming: null, bestRated: null, at: 0, error: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { upcoming: null, bestRated: null, at: 0, error: false }
  }
}

export const useShelves = create<Shelves>()(() => read())

let loading = false
export async function loadShelves() {
  const key = config.gaming?.rawgKey
  const s = useShelves.getState()
  if (!key || loading || (s.upcoming && Date.now() - s.at < FRESH)) return
  loading = true
  try {
    const q = shelfQueries(new Date())
    const get = async (query: string) => {
      const r = await fetch(`https://api.rawg.io/api/games?key=${key}&${query}`)
      if (!r.ok) throw new Error(`RAWG ${r.status}`)
      return toListedGames(((await r.json()) as { results: Parameters<typeof toListedGames>[0] }).results ?? [])
    }
    const [upcoming, bestRated] = await Promise.all([get(q.upcoming), get(q.bestRated)])
    const next = { upcoming, bestRated, at: Date.now(), error: false }
    useShelves.setState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* kept for this session */
    }
  } catch (error) {
    console.warn('[paddock] game lists', error)
    useShelves.setState({ error: true })
  } finally {
    loading = false
  }
}
