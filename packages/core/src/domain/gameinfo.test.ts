import { describe, expect, it } from 'vitest'
import { cleanGameTitle, fromRawg, metacriticTone, pickRawgResult, shorten } from './gameinfo'

describe('game info', () => {
  it('cleans console titles', () => {
    expect(cleanGameTitle('EA SPORTS FC™ 26')).toBe('EA SPORTS FC 26')
    expect(cleanGameTitle('Gran Turismo® 7 – PS5')).toBe('Gran Turismo 7')
    expect(cleanGameTitle('Marvel’s Spider-Man 2 (PS5)')).toBe('Marvel’s Spider-Man 2')
  })
  it('picks the matching search result', () => {
    const r = [
      { name: 'Astro Bot Rescue Mission', platforms: [{ platform: { slug: 'playstation4' } }] },
      { name: 'Astro Bot', platforms: [{ platform: { slug: 'playstation5' } }] },
    ]
    expect(pickRawgResult('ASTRO BOT™', r)?.name).toBe('Astro Bot')
  })
  it('reads a RAWG game', () => {
    const g = fromRawg({ name: 'Astro Bot', slug: 'astro-bot', metacritic: 94, rating: 4.46, developers: [{ name: 'Team Asobi' }], publishers: [{ name: 'Sony' }], genres: [{ name: 'Platformer' }], released: '2024-09-06' }, 1)
    expect(g).toMatchObject({ metacritic: 94, rating: 4.5, developers: ['Team Asobi'], rawgUrl: 'https://rawg.io/games/astro-bot', screenshots: [], esrb: null, playtime: null })
    const shots = fromRawg({ name: 'X', slug: 'x', short_screenshots: [{ image: 'https://media.rawg.io/media/games/a.jpg' }, { image: 'https://media.rawg.io/media/screenshots/b.jpg' }] }, 1)
    expect(shots.screenshots).toEqual(['https://media.rawg.io/media/crop/600/400/screenshots/b.jpg'])
  })
  it('shortens long descriptions at a sentence', () => {
    const text = 'This is one sentence of the story. '.repeat(10)
    const short = shorten(text, 100)
    expect(short.endsWith('.')).toBe(true)
    expect(short.length).toBeLessThanOrEqual(100)
    expect(shorten('word '.repeat(50), 40).endsWith('…')).toBe(true)
    expect(metacriticTone(94)).toBe('good')
  })
})

import { pickBestRated, pickUpcoming, shelfQueries, toListedGames } from './gameinfo'

describe('game lists', () => {
  it('builds the RAWG queries for the PS5', () => {
    const q = shelfQueries(new Date('2026-11-22T10:00:00Z'))
    expect(q.upcoming).toBe('platforms=187&dates=2026-11-23,2027-11-22&ordering=-added&page_size=12')
    expect(q.bestRated).toContain('dates=2025-11-22,2026-11-22&ordering=-rating')
  })
  it('keeps games still to come and games with a score', () => {
    const now = Date.parse('2026-11-22')
    const g = toListedGames([
      { id: 1, name: 'Out', released: '2026-11-01', background_image: 'https://media.rawg.io/media/games/a.jpg', rating: 4.4, ratings_count: 194 },
      { id: 4, name: 'Few votes', released: '2026-10-01', background_image: 'https://media.rawg.io/media/games/c.jpg', rating: 5, ratings_count: 3 },
      { id: 2, name: 'Soon', released: '2027-03-01', background_image: 'https://media.rawg.io/media/games/b.jpg' },
      { id: 3, name: 'No art', released: '2027-05-01' },
    ])
    expect(pickUpcoming(g, now).map((x) => x.name)).toEqual(['Soon'])
    expect(pickBestRated(g).map((x) => x.name)).toEqual(['Out'])
    expect(g[2].image).toBe('https://media.rawg.io/media/resize/420/-/games/b.jpg')
  })
})

import { fromRawgDetail, youtubeIds } from './gameinfo'

describe('game page', () => {
  it('reads a RAWG game with its screenshots', () => {
    const d = fromRawgDetail({ id: 7, name: 'Fable', slug: 'fable', tba: false, ratings_count: 31, platforms: [{ platform: { name: 'PlayStation 5' } }] }, [{ image: 'https://media.rawg.io/media/screenshots/a.jpg' }], 1)
    expect(d).toMatchObject({ id: 7, ratings: 31, platforms: ['PlayStation 5'] })
    expect(d.shots[0]).toEqual({ thumb: 'https://media.rawg.io/media/crop/600/400/screenshots/a.jpg', large: 'https://media.rawg.io/media/resize/1280/-/screenshots/a.jpg' })
  })
  it('reads the trailers from Wikidata', () => {
    const v = (value: unknown) => ({ mainsnak: { datavalue: { value } } })
    expect(youtubeIds({ claims: { P1651: [v('QdBZY2fkU-0'), v('VQRLujxTm3c'), v('bad id'), v('QdBZY2fkU-0')] } })).toEqual(['VQRLujxTm3c', 'QdBZY2fkU-0'])
    expect(youtubeIds(null)).toEqual([])
  })
})
