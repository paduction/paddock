import { describe, expect, it } from 'vitest'
import { toPlayer } from './media'
import { hasStarted, isCurrentTrack, playTracksCall, type Track } from './music'

const track: Track = { title: 'The Example Band - Morning light', id: 'provider://track/1', type: 'track', thumb: null }
const player = (state: string, title: string) => toPlayer('media_player.speakers', { entity_id: 'media_player.speakers', state, attributes: { media_title: title } } as any)

describe('music', () => {
  it('recognises the playing track by its title, with or without the artist in front', () => {
    expect(isCurrentTrack(track, player('playing', 'Morning light'))).toBe(true)
    expect(isCurrentTrack(track, player('playing', 'Another song'))).toBe(false)
  })

  it('a track has started when the speaker plays it or is paused on it', () => {
    expect(hasStarted(track, player('playing', 'Morning light'))).toBe(true)
    expect(hasStarted(track, player('paused', 'Morning light'))).toBe(true)
  })

  it('a track left idle in the queue, or another track, has not started', () => {
    expect(hasStarted(track, player('idle', 'Morning light'))).toBe(false)
    expect(hasStarted(track, player('playing', 'Another song'))).toBe(false)
    expect(hasStarted(track, player('off', ''))).toBe(false)
  })

  it('asks the music service for the tracks from the chosen one, replacing the queue', () => {
    expect(playTracksCall('media_player.speakers', [track])).toEqual({
      domain: 'music_assistant',
      service: 'play_media',
      target: 'media_player.speakers',
      data: { media_id: ['provider://track/1'], enqueue: 'replace' },
    })
  })
})
