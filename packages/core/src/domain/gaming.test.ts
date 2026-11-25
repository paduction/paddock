import { describe, expect, it } from 'vitest'
import { lastGame, onlineStatus, toConsole } from './gaming'
import type { HassEntity } from '../ha/types'

const e = (state: string, attributes: Record<string, unknown> = {}, last_changed = '2026-11-21T20:00:00Z'): HassEntity =>
  ({ entity_id: 'x.y', state, attributes, last_changed, last_updated: last_changed }) as HassEntity

describe('game console', () => {
  it('reads the game being played', () => {
    const c = toConsole({ console: e('playing', { media_title: 'Astro Bot', entity_picture: '/api/pic' }), status: e('online'), power: e('on') })
    expect(c.power).toBe('on')
    expect(c.game).toEqual({ title: 'Astro Bot', picture: '/api/pic', since: Date.parse('2026-11-21T20:00:00Z') })
  })
  it('is in rest mode when the switch is off', () => {
    const c = toConsole({ console: e('off'), status: e('offline'), power: e('off') })
    expect(c.power).toBe('standby')
    expect(c.game).toBeNull()
  })
  it('maps the online status', () => {
    expect(onlineStatus(e('online_on_ps_app'))).toBe('app')
    expect(onlineStatus(e('away'))).toBe('away')
    expect(onlineStatus(e('unavailable'))).toBeNull()
  })
  it('finds the last game and when it stopped', () => {
    expect(lastGame([[1, 'Astro Bot'], [5, ''], [9, 'unknown']])).toEqual({ title: 'Astro Bot', end: 5 })
    expect(lastGame([[1, 'unknown']])).toBeNull()
  })
})

import { gameSessions, playtime, topGames } from './gaming'

describe('play sessions', () => {
  const m = 60e3
  const history: [number, string][] = [
    [0, 'unknown'], [10 * m, 'Astro Bot'], [70 * m, 'unknown'], [75 * m, 'Astro Bot'], [100 * m, 'GT7'], [100.5 * m, 'unknown'], [200 * m, 'GT7'],
  ]
  it('builds sessions, merges a quick resume, drops blips', () => {
    expect(gameSessions(history)).toEqual([
      { title: 'Astro Bot', start: 10 * m, end: 100 * m },
      { title: 'GT7', start: 200 * m, end: null },
    ])
  })
  it('sums the play time and ranks the games', () => {
    const s = gameSessions(history)
    expect(playtime(s, 0, 230 * m)).toBe(120 * m)
    expect(playtime(s, 50 * m, 230 * m, 'Astro Bot')).toBe(50 * m)
    expect(topGames(s, 0, 230 * m).map((g) => g.title)).toEqual(['Astro Bot', 'GT7'])
  })
})
