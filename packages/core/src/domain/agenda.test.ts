import { describe, expect, it } from 'vitest'
import { buildAgenda, eventTiming, upcoming } from './agenda'

const calendar = { entity: 'calendar.family', name: 'Family' }
const people = [{ name: 'Alex', entity: 'person.alex' }, { name: 'Sam', entity: 'person.sam' }]
const now = new Date('2026-11-21T09:00:00')

describe('agenda', () => {
  const events = buildAgenda(
    [
      { summary: 'Tennis with Sam', start: '2026-11-21T18:30:00', end: '2026-11-21T19:30:00', calendar },
      { summary: 'Dentist', start: '2026-11-21T09:30:00', end: '2026-11-21T10:00:00', calendar },
      { summary: 'Holidays', start: '2026-11-23', end: '2026-11-26', calendar },
      { summary: 'Too far', start: '2026-12-20T10:00:00', end: '2026-12-20T11:00:00', calendar },
    ],
    people,
    now,
  )

  it('sorts by start and drops events beyond two weeks', () => {
    expect(events.map((e) => e.title)).toEqual(['Dentist', 'Tennis with Sam', 'Holidays'])
  })

  it('finds people named in the title', () => {
    expect(events[1].people).toEqual(['S'])
  })

  it('counts all-day events in days', () => {
    expect(events[2]).toMatchObject({ allDay: true, days: 3, day: 2 })
  })

  it('describes timing relative to now', () => {
    expect(eventTiming(events[0], now)).toEqual({ kind: 'in', minutes: 30 })
    expect(eventTiming(events[1], now)).toEqual({ kind: 'today-at' })
    expect(eventTiming(events[2], now)).toEqual({ kind: 'later', day: 2 })
  })

  it('returns the next event and what is left today', () => {
    expect(upcoming(events, now)).toMatchObject({ next: { title: 'Dentist' }, leftToday: 2 })
  })
})
