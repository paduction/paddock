import type { CalendarConfig, PersonConfig } from '../config/schema'

/** Event as returned by calendar.get_events, plus the calendar it came from. */
export interface RawEvent {
  summary?: string
  start: string
  end: string
  location?: string
  description?: string
  calendar: CalendarConfig
}

export interface AgendaEvent {
  title: string
  place: string
  start: Date
  end: Date
  allDay: boolean
  /** Number of days covered (all-day events). */
  days: number
  /** Days from today: 0 = today, 1 = tomorrow… */
  day: number
  /** Initials of the people concerned. */
  people: string[]
  notes: string
  calendar: CalendarConfig
}

const DAY = 864e5

function startOfDay(now: Date): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Calendar people + people whose first name appears in the title. */
function concernedPeople(title: string, calendar: CalendarConfig, people: PersonConfig[]): string[] {
  const keys = new Set((calendar.people ?? '').split(''))
  for (const { name } of people) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(title)) keys.add(name.charAt(0))
  }
  return people.map((p) => p.name.charAt(0)).filter((initial) => keys.has(initial))
}

/** Normalizes, keeps the next 2 weeks, sorts by start time. */
export function buildAgenda(raw: RawEvent[], people: PersonConfig[], now: Date): AgendaEvent[] {
  const today = startOfDay(now).getTime()
  return raw
    .map((x) => {
      const allDay = !x.start.includes('T')
      const start = new Date(allDay ? `${x.start}T00:00` : x.start)
      const end = new Date(allDay ? `${x.end}T00:00` : x.end)
      const title = (x.summary || '').trim()
      return {
        title,
        place: (x.location || '').replace(/\s*\n\s*/g, ', ').trim(),
        start,
        end,
        allDay,
        days: allDay ? Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY)) : 1,
        day: Math.floor((start.getTime() - today) / DAY),
        people: concernedPeople(title, x.calendar, people),
        notes: (x.description || '').trim(),
        calendar: x.calendar,
      }
    })
    .filter((e) => e.end.getTime() > today && e.day <= 14)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

export type EventTiming =
  | { kind: 'ended' }
  | { kind: 'ongoing' }
  | { kind: 'in'; minutes: number }
  | { kind: 'today-at' }
  | { kind: 'later'; day: number }

export function eventTiming(e: AgendaEvent, now: Date): EventTiming {
  if (e.end.getTime() <= now.getTime()) return { kind: 'ended' }
  if (e.day >= 1) return { kind: 'later', day: e.day }
  const minutes = Math.round((e.start.getTime() - now.getTime()) / 60000)
  if (minutes <= 0) return { kind: 'ongoing' }
  if (minutes < 180) return { kind: 'in', minutes }
  return { kind: 'today-at' }
}

/** Next event + the two following ones, and how many are still to come today. */
export function upcoming(events: AgendaEvent[], now: Date) {
  const index = events.findIndex((e) => e.end.getTime() > now.getTime())
  if (index < 0) return null
  return {
    next: events[index],
    rest: events.slice(index + 1, index + 3),
    leftToday: events.filter((e) => e.day <= 0 && e.end.getTime() > now.getTime()).length,
  }
}
