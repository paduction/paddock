import { describe, expect, it } from 'vitest'
import { groupEvents } from './cameras'

const f = (dir: string, name: string) => ({ dir, name, id: `${dir}/${name}` })

describe('camera events', () => {
  it('groups pictures and video of one detection', () => {
    const now = new Date('2026-11-21T12:00:00').getTime()
    const events = groupEvents(
      [
        f('Salon', '2026-11-21_11-00-00_Salon_motion.jpg'),
        f('Salon', '2026-11-21_11-00-03_Salon_person.jpg'),
        f('Salon', '2026-11-21_11-00-20_Salon_person.mp4'),
        f('Salon', '2026-11-21_11-30-00_Salon_live.jpg'),
        f('Garage', '2026-11-01_10-00-00_Garage_person.jpg'),
      ],
      now,
    )
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ dir: 'Salon', kind: 'person', img: 'Salon/2026-11-21_11-00-03_Salon_person.jpg', video: 'Salon/2026-11-21_11-00-20_Salon_person.mp4' })
  })

  it('uses a live snapshot as thumbnail for a video-only event', () => {
    const now = new Date('2026-11-21T12:00:00').getTime()
    const events = groupEvents(
      [f('Piscine', '2026-11-21_11-00-00_Piscine_live.mp4'), f('Piscine', '2026-11-21_11-00-40_Piscine_live.jpg'), f('Piscine', '2026-11-21_11-30-00_Piscine_live.jpg')],
      now,
    )
    expect(events).toHaveLength(1)
    expect(events[0].img).toBe('Piscine/2026-11-21_11-00-40_Piscine_live.jpg')
  })

  it('keeps quiet cameras when a busy one has many events', () => {
    const now = new Date('2026-11-21T12:00:00').getTime()
    const busy = Array.from({ length: 150 }, (_, i) => f('Portail', `2026-11-21_${String(Math.floor(i / 30) + 6).padStart(2, '0')}-${String((i % 30) * 2).padStart(2, '0')}-00_Portail_motion.jpg`))
    const events = groupEvents([...busy, f('Sonnette', '2026-11-18_18-32-23_Sonnette_event.jpg')], now)
    expect(events.some((e) => e.dir === 'Sonnette')).toBe(true)
  })
})
