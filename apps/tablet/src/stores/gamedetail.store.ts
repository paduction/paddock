import { create } from 'zustand'
import { fromRawgDetail, type GameDetail } from '@paddock/core'
import { config } from '../config'
import { locale } from '../i18n'
import { trailers, wikipedia } from './gameinfo.store'

/** Full game pages (RAWG + Wikipedia + Wikidata trailers), by RAWG id, kept 7 days on the tablet. */
const KEY = 'paddock.gamePages'
const FRESH = 7 * 864e5

function read(): Record<number, GameDetail> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export const useGamePages = create<{ pages: Record<number, GameDetail>; failed: Record<number, boolean> }>()(() => ({ pages: read(), failed: {} }))

function save(page: GameDetail) {
  const all = { ...useGamePages.getState().pages, [page.id]: page }
  const kept = Object.fromEntries(Object.values(all).sort((a, b) => b.fetchedAt - a.fetchedAt).slice(0, 24).map((p) => [p.id, p]))
  useGamePages.setState({ pages: kept })
  try {
    localStorage.setItem(KEY, JSON.stringify(kept))
  } catch {
    /* kept for this session */
  }
}

async function json<T>(url: string): Promise<T | null> {
  const r = await fetch(url)
  return r.ok ? ((await r.json()) as T) : null
}

const loading = new Set<number>()

export async function loadGamePage(id: number) {
  const key = config.gaming?.rawgKey
  const known = useGamePages.getState().pages[id]
  if (!key || loading.has(id) || (known && Date.now() - known.fetchedAt < FRESH)) return
  loading.add(id)
  try {
    const [game, shots] = await Promise.all([
      json<Parameters<typeof fromRawgDetail>[0]>(`https://api.rawg.io/api/games/${id}?key=${key}`),
      json<{ results?: { image: string }[] }>(`https://api.rawg.io/api/games/${id}/screenshots?key=${key}&page_size=12`).catch(() => null),
    ])
    if (!game) throw new Error('RAWG')
    let page = fromRawgDetail(game, shots?.results ?? [], Date.now())
    const wiki = await wikipedia(game.name, config.gaming?.wikipedia ?? locale).catch(() => null)
    if (wiki) {
      page = { ...page, description: wiki.text, descriptionSource: 'wikipedia', wikipediaUrl: wiki.url }
      if (wiki.item) page = { ...page, trailers: await trailers(wiki.item) }
    }
    save(page)
  } catch (error) {
    console.warn('[paddock] game page', id, error)
    useGamePages.setState((s) => ({ failed: { ...s.failed, [id]: true } }))
  } finally {
    loading.delete(id)
  }
}
