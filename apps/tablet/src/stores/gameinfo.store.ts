import { create } from 'zustand'
import { cleanGameTitle, fromRawg, pickRawgResult, shorten, youtubeIds, type GameInfo } from '@paddock/core'
import { config } from '../config'
import { locale } from '../i18n'

/** Game details by console title. null = looked up, nothing found. Kept on the tablet for 30 days. */
const KEY = 'paddock.gameInfo.v3'
const FRESH = 30 * 864e5
const RETRY = 864e5

function read(): Record<string, GameInfo | null> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export const useGameInfo = create<{ info: Record<string, GameInfo | null>; missedAt: Record<string, number> }>()(() => ({ info: read(), missedAt: {} }))

function save(title: string, info: GameInfo | null) {
  const all = { ...useGameInfo.getState().info, [title]: info }
  const kept = Object.fromEntries(
    Object.entries(all)
      .filter(([, v]) => v)
      .sort((a, b) => b[1]!.fetchedAt - a[1]!.fetchedAt)
      .slice(0, 40),
  )
  useGameInfo.setState((s) => ({ info: { ...kept, ...(info ? {} : { [title]: null }) }, missedAt: info ? s.missedAt : { ...s.missedAt, [title]: Date.now() } }))
  try {
    localStorage.setItem(KEY, JSON.stringify(kept))
  } catch {
    /* storage blocked: kept for this session */
  }
}

async function json<T>(url: string): Promise<T | null> {
  const r = await fetch(url)
  return r.ok ? ((await r.json()) as T) : null
}

async function rawg(title: string, key: string, now: number): Promise<GameInfo | null> {
  type Result = { id: number; name: string; platforms?: { platform: { slug: string } }[] | null; short_screenshots?: { image: string }[]; esrb_rating?: { name: string } | null; playtime?: number | null }
  const q = encodeURIComponent(cleanGameTitle(title))
  const found = await json<{ results: Result[] }>(`https://api.rawg.io/api/games?key=${key}&search=${q}&search_precise=true&page_size=5`)
  const best = pickRawgResult(title, found?.results ?? [])
  if (!best) return null
  const game = await json<Parameters<typeof fromRawg>[0]>(`https://api.rawg.io/api/games/${best.id}?key=${key}`)
  // screenshots are only in the search results
  return game ? fromRawg({ ...game, short_screenshots: best.short_screenshots, esrb_rating: game.esrb_rating ?? best.esrb_rating, playtime: game.playtime || best.playtime }, now) : null
}

/** Summary of the Wikipedia article about the game, checked to really be about a video game. */
export async function wikipedia(title: string, lang: string): Promise<{ text: string; url: string; item: string | null } | null> {
  const kind = lang === 'fr' ? 'jeu vidéo' : 'video game'
  const base = `https://${lang}.wikipedia.org`
  const search = await json<{ query?: { search?: { title: string }[] } }>(
    `${base}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${cleanGameTitle(title)} ${kind}`)}&srlimit=3&format=json&origin=*`,
  )
  for (const hit of search?.query?.search ?? []) {
    const page = await json<{ extract?: string; description?: string; content_urls?: { desktop?: { page?: string } }; type?: string; wikibase_item?: string }>(
      `${base}/api/rest_v1/page/summary/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`,
    )
    const about = `${page?.description ?? ''} ${page?.extract ?? ''}`.toLowerCase()
    if (page?.extract && page.type !== 'disambiguation' && about.includes(kind)) return { text: shorten(page.extract, 1200), url: page.content_urls?.desktop?.page ?? `${base}/wiki/${encodeURIComponent(hit.title)}`, item: page.wikibase_item ?? null }
  }
  return null
}

/** Official trailers of a Wikidata item (YouTube ids). */
export async function trailers(item: string): Promise<string[]> {
  const claims = await json<Parameters<typeof youtubeIds>[0]>(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${item}&property=P1651&format=json&origin=*`).catch(() => null)
  return youtubeIds(claims)
}

const loading = new Set<string>()

/** Looks a game up once (RAWG for credits and Metacritic, Wikipedia for the description). */
export async function loadGameInfo(title: string) {
  const cfg = config.gaming
  if (!cfg || loading.has(title)) return
  const s = useGameInfo.getState()
  const known = s.info[title]
  if (known && Date.now() - known.fetchedAt < FRESH) return
  if (known === null && Date.now() - (s.missedAt[title] ?? 0) < RETRY) return
  loading.add(title)
  const now = Date.now()
  try {
    const [fromRawgInfo, wiki] = await Promise.all([
      cfg.rawgKey ? rawg(title, cfg.rawgKey, now).catch(() => null) : Promise.resolve(null),
      wikipedia(title, cfg.wikipedia ?? locale).catch(() => null),
    ])
    let info = fromRawgInfo
    if (wiki) {
      info = info ?? { name: cleanGameTitle(title), developers: [], publishers: [], genres: [], released: null, metacritic: null, rating: null, description: '', descriptionSource: null, wikipediaUrl: null, rawgUrl: null, image: null, screenshots: [], esrb: null, playtime: null, fetchedAt: now }
      info = { ...info, description: shorten(wiki.text), descriptionSource: 'wikipedia', wikipediaUrl: wiki.url, trailers: wiki.item ? await trailers(wiki.item) : [] }
    }
    save(title, info)
  } finally {
    loading.delete(title)
  }
}
