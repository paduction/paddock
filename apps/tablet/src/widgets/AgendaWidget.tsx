import { AgendaCard, PanelHeading, type AgendaItem } from '@paddock/ui'
import { buildAgenda, eventTiming, upcoming, type AgendaEvent } from '@paddock/core'
import { config } from '../config'
import { formatTime, formatWeekday, t } from '../i18n'
import { useAgenda } from '../stores/agenda.store'
import { useMinute } from '../stores/clock.store'
import { overlays } from './SidebarOverlays'

function peopleOf(e: AgendaEvent) {
  return e.people.map((initial) => {
    const index = config.people.findIndex((p) => p.name.charAt(0) === initial)
    return { initial, name: config.people[index]?.name ?? initial, tone: index }
  })
}

function whenLabel(e: AgendaEvent, now: Date): string {
  const timing = eventTiming(e, now)
  switch (timing.kind) {
    case 'ended':
      return t('agenda.ended')
    case 'ongoing':
      return t('agenda.ongoing')
    case 'in':
      return timing.minutes < 60
        ? t('agenda.inMinutes', { n: timing.minutes })
        : t('agenda.inHours', { h: Math.floor(timing.minutes / 60), m: String(timing.minutes % 60).padStart(2, '0') })
    case 'today-at':
      return t('agenda.at', { time: formatTime(e.start) })
    case 'later': {
      const day = timing.day === 1 ? t('agenda.tomorrow') : `${formatWeekday(e.start)} ${e.start.getDate()}`
      return e.allDay ? day : `${day} · ${formatTime(e.start)}`
    }
  }
}

function meta(e: AgendaEvent): string {
  const time = e.allDay ? (e.days > 1 ? t('agenda.days', { n: e.days }) : t('agenda.allDay')) : `${formatTime(e.start)} – ${formatTime(e.end)}`
  return e.place ? `${time} · ${e.place.split(',')[0]}` : time
}

function shortWhen(e: AgendaEvent): string {
  if (e.day <= 0) return e.allDay ? t('agenda.dayShort') : formatTime(e.start)
  return e.day === 1 ? t('agenda.tomorrowShort') : formatWeekday(e.start)
}

/** Sidebar agenda. `compact` hides the following events (when the mini player needs the room). */
export function AgendaWidget({ compact }: { compact: boolean }) {
  const raw = useAgenda((s) => s.events)
  const now = new Date(useMinute() * 60000)
  const events = buildAgenda(raw, config.people, now)
  const next = upcoming(events, now)

  let card: { next: AgendaItem; rest: AgendaItem[] }
  if (!next) {
    const none = config.calendars.length === 0
    card = {
      next: { when: '', title: t(none ? 'agenda.noCalendar' : 'agenda.nothingPlanned'), meta: t(none ? 'agenda.addCalendar' : 'agenda.nextTwoWeeks'), people: [] },
      rest: [],
    }
  } else {
    card = {
      next: { when: whenLabel(next.next, now), title: next.next.title, meta: meta(next.next), people: peopleOf(next.next) },
      rest: compact ? [] : next.rest.map((e) => ({ when: shortWhen(e), title: e.title, people: peopleOf(e) })),
    }
  }
  const count = !next ? '' : next.leftToday ? t('agenda.leftToday', { n: next.leftToday }) : t('agenda.nothingToday')

  return (
    <>
      <PanelHeading title={t('sidebar.agenda')} aside={count} />
      <AgendaCard next={card.next} rest={card.rest} onOpen={next ? (i) => overlays.agenda(events.indexOf(next.next) + i) : undefined} />
    </>
  )
}
