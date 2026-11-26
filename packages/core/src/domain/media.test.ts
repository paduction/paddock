import { describe, expect, it } from 'vitest'
import { isActive, livePosition, toPlayer } from './media'

const entity = (state: string, attributes: Record<string, unknown>) => ({ entity_id: 'media_player.speakers', state, attributes }) as any

describe('toPlayer', () => {
  it('reads a song', () => {
    const p = toPlayer('media_player.speakers', entity('playing', { media_title: 'Morning light', media_artist: 'The Example Band', volume_level: 0.35, entity_picture: '/api/x' }))
    expect(p).toMatchObject({ title: 'Morning light', artist: 'The Example Band', volume: 35, picture: '/api/x', fromTv: false })
    expect(isActive(p)).toBe(true)
  })

  it('recognises the sound of a TV sent to the speakers', () => {
    const p = toPlayer('media_player.speakers', entity('paused', { media_title: 'A film', media_artist: 'Drama', app_id: 'com.apple.tvairplayd' }))
    expect(p.fromTv).toBe(true)
  })

  it('treats a bundle id given as title as no title', () => {
    const p = toPlayer('media_player.speakers', entity('playing', { media_title: 'com.example.player', app_id: 'com.example.player' }))
    expect(p.title).toBe('')
    expect(isActive(p)).toBe(false)
  })

  it('is unavailable without an entity', () => {
    expect(toPlayer('media_player.speakers').state).toBe('unavailable')
  })
})

describe('livePosition', () => {
  it('advances while playing and stays put when paused', () => {
    const at = Date.parse('2026-01-01T10:00:00Z')
    const base = { media_title: 'x', media_duration: 200, media_position: 50, media_position_updated_at: '2026-01-01T10:00:00Z' }
    expect(livePosition(toPlayer('m', entity('playing', base)), at + 10_000)).toBe(60)
    expect(livePosition(toPlayer('m', entity('paused', base)), at + 10_000)).toBe(50)
  })
})
