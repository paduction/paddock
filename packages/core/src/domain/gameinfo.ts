/** Game details from RAWG (credits, Metacritic) and Wikipedia (description). */

export interface GameInfo {
  name: string
  developers: string[]
  publishers: string[]
  genres: string[]
  /** YYYY-MM-DD */
  released: string | null
  metacritic: number | null
  /** RAWG users, 0–5 */
  rating: number | null
  description: string
  descriptionSource: 'wikipedia' | 'rawg' | null
  wikipediaUrl: string | null
  rawgUrl: string | null
  /** Wide artwork, used when the console gave no cover */
  image: string | null
  /** A few screenshots (resized) */
  screenshots: string[]
  /** ESRB: Everyone, Teen, Mature… */
  esrb: string | null
  /** Average play time of RAWG users, hours */
  playtime: number | null
  /** YouTube ids of the official trailers (Wikidata) */
  trailers?: string[]
  fetchedAt: number
}

/** "EA SPORTS FC™ 26" → "EA SPORTS FC 26", "Astro Bot – PS5" → "Astro Bot" */
export function cleanGameTitle(title: string): string {
  return title
    .replace(/[™®©]/g, '')
    .replace(/\s*[-–—:|]\s*(PS5|PS4|PlayStation\s*[45])(\s*(Edition|Version))?\s*$/i, '')
    .replace(/\s*\((PS5|PS4)\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const norm = (s: string) => cleanGameTitle(s).toLowerCase().replace(/[^a-z0-9]+/g, '')

/** Best RAWG search result for a title: same name first, else the first PlayStation game, else the first one. */
export function pickRawgResult<T extends { name: string; platforms?: { platform: { slug: string } }[] | null }>(title: string, results: T[]): T | null {
  const wanted = norm(title)
  const onPs = (r: T) => (r.platforms ?? []).some((p) => /playstation/.test(p.platform.slug))
  return results.find((r) => norm(r.name) === wanted) ?? results.find(onPs) ?? results[0] ?? null
}

interface RawgGame {
  name: string
  slug: string
  description_raw?: string
  released?: string | null
  metacritic?: number | null
  rating?: number | null
  background_image?: string | null
  developers?: { name: string }[]
  publishers?: { name: string }[]
  genres?: { name: string }[]
  esrb_rating?: { name: string } | null
  playtime?: number | null
  short_screenshots?: { image: string }[]
}

/** RAWG serves full-size images; its crop path gives a light version. */
export const rawgThumb = (url: string) => url.replace('media.rawg.io/media/', 'media.rawg.io/media/crop/600/400/')
/** RAWG only serves a few crop sizes (others redirect, no image); a resize to a width always works. */
export const rawgResize = (url: string, width = 420) => url.replace('media.rawg.io/media/', `media.rawg.io/media/resize/${width}/-/`)

export function fromRawg(g: RawgGame, now: number): GameInfo {
  return {
    name: g.name,
    developers: (g.developers ?? []).map((d) => d.name),
    publishers: (g.publishers ?? []).map((p) => p.name),
    genres: (g.genres ?? []).map((x) => x.name),
    released: g.released ?? null,
    metacritic: g.metacritic ?? null,
    rating: g.rating ? Math.round(g.rating * 10) / 10 : null,
    description: shorten(g.description_raw ?? ''),
    descriptionSource: g.description_raw ? 'rawg' : null,
    wikipediaUrl: null,
    rawgUrl: `https://rawg.io/games/${g.slug}`,
    image: g.background_image ?? null,
    // the first "short screenshot" is the cover artwork itself
    screenshots: (g.short_screenshots ?? []).slice(1, 5).map((x) => rawgThumb(x.image)),
    esrb: g.esrb_rating?.name ?? null,
    playtime: g.playtime || null,
    fetchedAt: now,
  }
}

/** First paragraphs, up to ~700 characters, cut at a sentence. */
export function shorten(text: string, max = 700): string {
  const t = text.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…').trim()
}

/** Metacritic colour scale. */
export const metacriticTone = (score: number): 'good' | 'mixed' | 'bad' => (score >= 75 ? 'good' : score >= 50 ? 'mixed' : 'bad')

/* ---------- Game lists (upcoming / best rated) ---------- */

/** RAWG platform id of the PlayStation 5. */
export const RAWG_PS5 = 187

export interface ListedGame {
  id: number
  name: string
  released: string | null
  tba: boolean
  metacritic: number | null
  /** RAWG players, 0–5, and how many ratings */
  rating: number | null
  ratings: number
  image: string | null
}

interface RawgListItem {
  id: number
  name: string
  released?: string | null
  tba?: boolean
  metacritic?: number | null
  rating?: number | null
  ratings_count?: number | null
  background_image?: string | null
}

export function toListedGames(results: RawgListItem[]): ListedGame[] {
  return results.map((g) => ({
    id: g.id,
    name: g.name,
    released: g.released ?? null,
    tba: !!g.tba,
    metacritic: g.metacritic ?? null,
    rating: g.rating || null,
    ratings: g.ratings_count ?? 0,
    image: g.background_image ? rawgResize(g.background_image) : null,
  }))
}

const ymd = (d: Date) => d.toISOString().slice(0, 10)

/** Query strings for /api/games (without the key). */
export function shelfQueries(now: Date, platform = RAWG_PS5) {
  const inAYear = new Date(now.getTime() + 365 * 864e5)
  const aYearAgo = new Date(now.getTime() - 365 * 864e5)
  const tomorrow = new Date(now.getTime() + 864e5)
  return {
    /** most awaited: the games most added to RAWG libraries */
    upcoming: `platforms=${platform}&dates=${ymd(tomorrow)},${ymd(inAYear)}&ordering=-added&page_size=12`,
    /** best players' ratings of the last 12 months (RAWG no longer gets Metacritic scores for recent games) */
    bestRated: `platforms=${platform}&dates=${ymd(aYearAgo)},${ymd(now)}&ordering=-rating&page_size=40`,
  }
}

/** Upcoming list: still to come, with an artwork, soonest-awaited order kept. */
export const pickUpcoming = (games: ListedGame[], now: number, n = 4) =>
  games.filter((g) => g.image && (!g.released || Date.parse(g.released) > now)).slice(0, n)

/** Best rated list: enough players' ratings to mean something, with an artwork. */
export const pickBestRated = (games: ListedGame[], n = 4, minRatings = 20) =>
  games.filter((g) => g.image && g.rating && g.ratings >= minRatings).sort((a, b) => b.rating! - a.rating!).slice(0, n)

/** Players' rating colour scale (out of 5). */
export const ratingTone = (rating: number): 'good' | 'mixed' | 'bad' => (rating >= 4 ? 'good' : rating >= 3 ? 'mixed' : 'bad')

/* ---------- Full game page (from a list) ---------- */

export interface GameDetail extends GameInfo {
  id: number
  tba: boolean
  ratings: number
  platforms: string[]
  /** YouTube ids of the official trailers (Wikidata P1651) */
  trailers: string[]
  /** Full list of screenshots: small for the strip, large for the viewer */
  shots: { thumb: string; large: string }[]
}

interface RawgDetail extends RawgGame {
  id: number
  tba?: boolean
  ratings_count?: number
  platforms?: { platform: { name: string } }[] | null
}

export function fromRawgDetail(g: RawgDetail, screenshots: { image: string }[], now: number): GameDetail {
  const base = fromRawg(g, now)
  return {
    ...base,
    id: g.id,
    tba: !!g.tba,
    ratings: g.ratings_count ?? 0,
    platforms: (g.platforms ?? []).map((p) => p.platform.name),
    trailers: [],
    shots: screenshots.map((s) => ({ thumb: rawgThumb(s.image), large: rawgResize(s.image, 1280) })),
  }
}

/** YouTube ids from Wikidata claims (property P1651), most recent first, without duplicates. */
export function youtubeIds(claims: { claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]> } | null, max = 4): string[] {
  const ids = (claims?.claims?.P1651 ?? []).map((c) => c.mainsnak?.datavalue?.value).filter((v): v is string => typeof v === 'string' && /^[\w-]{11}$/.test(v))
  return [...new Set(ids)].reverse().slice(0, max)
}

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
/** Embed with the JS API on, so the page hears when YouTube refuses to play the video here. */
export const youtubeEmbed = (id: string, origin: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`
/** Opens the video in the YouTube app (Apple TV: media_player.play_media, type url → launch_app). */
export const youtubeAppUrl = (id: string) => `youtube://www.youtube.com/watch?v=${id}`
