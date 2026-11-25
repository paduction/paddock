import { useEffect } from 'react'
import { AgendaSheet, ClimateHistory, HISTORY_CHART, PresencePanel, WeatherSheet, useTween, type AgendaListItem, type WeatherTone } from '@paddock/ui'
import {
  HISTORY_LABELS,
  buildAgenda,
  dailyBars,
  eventTiming,
  forecastTone,
  historyChart,
  homeSummary,
  nextHours,
  numericState,
  rainOf,
  resample,
  seriesStats,
  toPerson,
  toWeatherNow,
  uvLevel,
  weatherIcon,
  type AgendaEvent,
  type Forecast,
  type HistoryRange,
} from '@paddock/core'
import { useShallow } from 'zustand/react/shallow'
import { config } from '../config'
import { decimal, formatDate, formatLongDate, formatShortDate, formatTime, formatWeekday, since, t } from '../i18n'
import type { MessageKey } from '../i18n/fr'
import { useAgenda } from '../stores/agenda.store'
import { useClock, useMinute } from '../stores/clock.store'
import { useThermostat } from '../stores/climate.store'
import { useEntity, useHass } from '../stores/hass.store'
import { loadHistory, useHistory } from '../stores/history.store'
import { useUi, type Overlay } from '../stores/ui.store'
import { useForecast } from '../stores/weather.store'
import { GameOverlay } from './GamingWidget'
import { GameDetailOverlay } from './GameDetailOverlay'

const close = () => useUi.getState().open(null)
/** The history keeps the last range chosen. */
let lastRange: HistoryRange = '24h'

/* ---------------- Weather ---------------- */

/** 1 decimal, without a trailing ,0 */
const short = (n: number) => {
  const v = Math.round(n * 10) / 10
  return decimal(v, Number.isInteger(v) ? 0 : 1)
}

function rainLabel(f: Forecast) {
  const r = rainOf(f)
  return { rain: r.probability != null ? `${r.probability} %` : r.mm != null ? `${short(r.mm)} mm` : '', wet: r.level >= 30 }
}

function WeatherOverlay() {
  const { weather, sun, outdoorTemperature } = config.sidebar
  const now = toWeatherNow(useEntity(weather))
  const sunEntity = useEntity(sun)
  const temperature = numericState(useEntity(outdoorTemperature))
  const humidity = now.humidity
  const { daily, hourly } = useForecast(useShallow((s) => ({ daily: s.daily, hourly: s.hourly })))
  const date = new Date(useMinute() * 60000)
  const night = sunEntity ? sunEntity.state !== 'above_horizon' : date.getHours() >= 19 || date.getHours() < 7
  const shown = useTween(temperature ?? 0, 500, 0.005)

  const days = dailyBars(daily.slice(0, 15)).map((d, i) => {
    const icon = weatherIcon(d.forecast.condition, false)
    const day = new Date(d.forecast.datetime)
    return {
      label: i ? formatWeekday(day) : t('weather.today'),
      date: String(day.getDate()),
      icon,
      tone: forecastTone(icon) as WeatherTone,
      temperature: `${d.max}°`,
      min: `${d.min}°`,
      today: i === 0,
      top: d.top,
      height: d.height,
      ...rainLabel(d.forecast),
    }
  })
  const hours = nextHours(hourly, date, sunEntity).map((h, i) => {
    const icon = weatherIcon(h.forecast.condition, h.night)
    return { label: i ? t('weather.hour', { n: h.hour }) : t('weather.now'), icon, tone: forecastTone(icon) as WeatherTone, temperature: `${Math.round(h.forecast.temperature)}°`, ...rainLabel(h.forecast) }
  })
  const rise = sunEntity?.attributes.next_rising
  const set = sunEntity?.attributes.next_setting
  const conditionKey = `weather.${now.condition}` as MessageKey

  return (
    <WeatherSheet
      icon={weatherIcon(now.condition, night)}
      temperature={`${temperature === null ? '—' : decimal(shown.value)}°`}
      condition={now.condition && t(conditionKey) !== conditionKey ? t(conditionKey) : '—'}
      detail={[days.length ? t('weather.maxMin', { max: days[0].temperature.slice(0, -1), min: days[0].min.slice(0, -1) }) : null, humidity != null ? t('weather.humidity', { n: Math.round(humidity) }) : null]
        .filter(Boolean)
        .join(' · ')}
      stats={[
        { label: t('weather.wind'), icon: 'air', value: now.wind != null ? `${Math.round(now.wind)} km/h` : '—' },
        { label: t('weather.uv'), icon: 'wb_sunny', value: now.uv != null ? `${Math.round(now.uv)} · ${t(`uv.${uvLevel(now.uv)}`)}` : '—' },
        { label: t('weather.sun'), icon: 'wb_twilight', value: rise && set ? `${formatTime(new Date(rise))} – ${formatTime(new Date(set))}` : '—' },
      ]}
      hoursTitle={t('weather.nextHours')}
      hours={hours}
      daysTitle={days.length ? t('weather.nextDays', { n: days.length }) : t('weather.unavailable')}
      daysLegend={t('weather.legend')}
      days={days}
      closeLabel={t('common.close')}
      onClose={close}
    />
  )
}

/* ---------------- Agenda ---------------- */

const tone = (initial: string) => config.people.findIndex((p) => p.name.charAt(0) === initial)
const peopleOf = (e: AgendaEvent) => e.people.map((initial) => ({ initial, name: config.people[tone(initial)]?.name ?? initial, tone: tone(initial) }))

function status(e: AgendaEvent, now: Date): { when: string; tone: 'accent' | 'green' | 'muted' | 'neutral'; past?: boolean } {
  const timing = eventTiming(e, now)
  switch (timing.kind) {
    case 'ended':
      return { when: t('agenda.ended'), tone: 'muted', past: true }
    case 'later': {
      const day = timing.day === 1 ? t('agenda.tomorrow') : `${formatWeekday(e.start)} ${e.start.getDate()}`
      return { when: e.allDay ? day : `${day} · ${formatTime(e.start)}`, tone: 'neutral' }
    }
    case 'ongoing':
      return { when: t('agenda.ongoing'), tone: 'green' }
    case 'in':
      return {
        when: timing.minutes < 60 ? t('agenda.inMinutes', { n: timing.minutes }) : t('agenda.inHours', { h: Math.floor(timing.minutes / 60), m: String(timing.minutes % 60).padStart(2, '0') }),
        tone: 'accent',
      }
    case 'today-at':
      return { when: t('agenda.at', { time: formatTime(e.start) }), tone: 'accent' }
  }
}

function duration(e: AgendaEvent): string {
  const minutes = Math.round((e.end.getTime() - e.start.getTime()) / 60000)
  if (minutes < 60) return t('agenda.minutes', { n: minutes })
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? t('agenda.hoursMinutes', { h, m: String(m).padStart(2, '0') }) : t('agenda.hours', { h })
}

function AgendaOverlay({ selected }: { selected: number | null }) {
  const raw = useAgenda((s) => s.events)
  const now = new Date(useMinute() * 60000)
  const events = buildAgenda(raw, config.people, now)
  const nextIndex = events.findIndex((e) => e.end.getTime() > now.getTime())
  if (nextIndex < 0) return null
  const current = selected ?? nextIndex
  const detail = events[current] ?? events[nextIndex]

  const row = (e: AgendaEvent, i: number): AgendaListItem => ({
    key: `${i}-${e.start.getTime()}`,
    when: e.day >= 1 ? (e.day === 1 ? t('agenda.tomorrowShort') : `${formatWeekday(e.start)} ${e.start.getDate()}`) : e.allDay ? t('agenda.dayShort') : formatTime(e.start),
    title: e.title,
    people: peopleOf(e),
    selected: i === current,
    past: !!status(e, now).past,
    onSelect: () => useUi.getState().open({ kind: 'agenda', selected: i }),
  })
  const indexed = events.map((e, i) => ({ e, i }))
  const today = indexed.filter(({ e }) => e.day <= 0).map(({ e, i }) => row(e, i))
  const later = indexed.filter(({ e }) => e.day >= 1).slice(0, 6).map(({ e, i }) => row(e, i))

  const day = detail.day <= 0 ? t('agenda.todayLower') : detail.day === 1 ? t('agenda.tomorrowLower') : formatLongDate(detail.start)
  const multi = detail.allDay && detail.days > 1
  const long = (d: Date) => formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' })
  const rows = [
    {
      icon: 'schedule',
      main: multi ? t('agenda.days', { n: detail.days }) : detail.allDay ? t('agenda.allDay') : `${formatTime(detail.start)} – ${formatTime(detail.end)}`,
      sub: multi ? t('agenda.fromTo', { from: long(detail.start), to: long(new Date(detail.end.getTime() - 864e5)) }) : detail.allDay ? day : `${duration(detail)} · ${day}`,
    },
  ]
  if (detail.place) rows.push({ icon: 'location_on', main: detail.place, sub: '' })
  const names = peopleOf(detail).map((p) => p.name)
  if (names.length) rows.push({ icon: 'group', main: names.join(t('agenda.and')), sub: t(names.length > 1 ? 'agenda.together' : 'agenda.concerned') })
  rows.push({ icon: 'calendar_month', main: detail.calendar.name || t('agenda.calendar'), sub: detail.calendar.source ?? '' })
  const s = status(detail, now)

  return (
    <AgendaSheet
      todayTitle={t('agenda.today')}
      laterTitle={t('agenda.upcoming')}
      today={today}
      later={later}
      source={config.calendars.length ? t('agenda.synced', { names: config.calendars.map((c) => c.name).join(' · ') }) : t('agenda.noSource')}
      detail={{ when: s.when, whenTone: s.tone, title: detail.title, rows, notesTitle: t('agenda.notes'), notes: detail.notes }}
      closeLabel={t('common.close')}
      onClose={close}
    />
  )
}

/* ---------------- Temperature history ---------------- */

const RANGES: { id: HistoryRange; key: MessageKey }[] = [
  { id: '24h', key: 'climate.range24h' },
  { id: '7d', key: 'climate.range7d' },
  { id: '30d', key: 'climate.range30d' },
]
const one = (n: number | null) => (n == null || Number.isNaN(n) ? '—' : decimal(n))

function xLabel(range: HistoryRange, ago: number, end: number) {
  const d = new Date(end - ago * 3600e3)
  if (!ago) return t(range === '24h' ? 'weather.now' : 'weather.today')
  if (range === '24h') return t('weather.hour', { n: d.getHours() })
  if (range === '7d') return formatWeekday(d)
  return formatShortDate(d)
}

function ClimateOverlay({ mode, range }: { mode: 'in' | 'pool'; range: HistoryRange }) {
  const [main, second] = config.sidebar.indoor
  const pool = mode === 'pool'
  // Sampled up to now: the chart follows the clock while it is open.
  const end = useClock((s) => s.now)
  const data = useHistory((s) => s.series[range]?.data)
  const values = useHass(
    useShallow((s) => [main?.temperature, second?.temperature, config.sidebar.pool, main?.humidity, second?.humidity].map((id) => numericState(id ? s.entities[id] : undefined))),
  )
  const [tIn, tSecond, tPool, hIn, hSecond] = values
  const thermostat = useThermostat()
  const target = thermostat?.target ?? null
  const shownIn = useTween(tIn ?? 0, 500, 0.005)
  const shownSecond = useTween(tSecond ?? 0, 500, 0.005)
  const shownPool = useTween(tPool ?? 0, 500, 0.005)

  useEffect(() => {
    loadHistory(range)
  }, [range])

  const sample = (id: string | undefined, current: number | null) => resample((id && data?.[id]) || [], range, end, current)
  const a = sample(main?.temperature, tIn)
  const b = sample(second?.temperature, tSecond)
  const c = sample(config.sidebar.pool, tPool)
  const seriesA = pool ? c : a
  const seriesB = pool ? [] : b
  const chart = historyChart(seriesA, seriesB, pool ? null : target, HISTORY_CHART.width, HISTORY_CHART.height)
  const stats = (s: number[], humidity?: number | null) => {
    const x = seriesStats(s)
    return [
      { label: t('climate.min'), value: `${one(x.min)}°` },
      { label: t('climate.avg'), value: `${one(x.avg)}°` },
      { label: t('climate.max'), value: `${one(x.max)}°` },
      ...(humidity == null ? [] : [{ label: t('climate.humidity'), value: `${Math.round(humidity)} %` }]),
    ]
  }
  const cards = pool
    ? [{ name: t('sidebar.pool'), color: 'var(--pd-blue)', current: one(tPool === null ? null : shownPool.value), stats: stats(c) }]
    : [
        { name: main?.label ?? '', color: 'var(--pd-accent)', current: one(tIn === null ? null : shownIn.value), stats: stats(a, hIn) },
        ...(second ? [{ name: second.label, color: 'var(--pd-blue)', current: one(tSecond === null ? null : shownSecond.value), stats: stats(b, hSecond) }] : []),
      ]

  return (
    <ClimateHistory
      title={t(pool ? 'climate.historyPool' : 'climate.historyIndoor')}
      ranges={RANGES.map((r) => ({ id: r.id, label: t(r.key) }))}
      range={range}
      onRange={(id) => {
        lastRange = id as HistoryRange
        useUi.getState().open({ kind: 'climate', mode, range: lastRange })
      }}
      cards={cards}
      chart={{
        lineA: chart.lineA,
        areaA: chart.areaA,
        colorA: pool ? 'var(--pd-blue)' : 'var(--pd-accent)',
        fillA: pool ? 'rgba(142,197,240,0.12)' : 'rgba(245,196,81,0.12)',
        lineB: pool || !second ? undefined : chart.lineB,
        endA: chart.endA,
        endB: pool || !second ? undefined : chart.endB,
        yTicks: chart.ticks.map((y) => ({ label: String(y.value), top: y.top })),
        target: !pool && target !== null && chart.targetTop !== undefined ? { top: chart.targetTop, label: t('climate.target', { n: one(target) }) } : undefined,
        xLabels: HISTORY_LABELS[range].map((ago) => xLabel(range, ago, end)),
      }}
      closeLabel={t('common.close')}
      onClose={close}
    />
  )
}

/* ---------------- Presence ---------------- */

function PresenceOverlay() {
  const entities = useHass(useShallow((s) => config.people.map((p) => s.entities[p.entity])))
  const now = useMinute() * 60000
  const people = config.people.map((cfg, i) => toPerson(cfg, entities[i]))
  const summary = homeSummary(people)
  const label =
    summary.kind === 'nobody' ? t('people.nobody')
    : summary.kind === 'everyone' ? t('people.everyone')
    : summary.kind === 'one' ? t('people.one', { name: summary.name })
    : t('people.some', { n: summary.count })
  const rows = people.map((p) => {
    const ago = since(p.since, now)
    if (!p.tracked) return { name: p.name, initial: p.initial, status: t('people.notTracked'), icon: 'help', tone: 'untracked' as const }
    if (p.home) return { name: p.name, initial: p.initial, status: t('people.homeSince', { ago }), icon: 'home', tone: 'home' as const }
    const away = p.state === 'not_home'
    return { name: p.name, initial: p.initial, status: away ? t('people.awaySince', { ago }) : t('people.zoneSince', { zone: p.state, ago }), icon: away ? 'location_away' : 'location_on', tone: 'away' as const }
  })
  return <PresencePanel title={t('people.title')} summary={label} someoneHome={summary.kind !== 'nobody'} people={rows} onClose={close} />
}

/* ---------------- Entry points ---------------- */

/** Open handlers for the sidebar and the presence chip. */
export const overlays = {
  weather: () => useUi.getState().open({ kind: 'weather' }),
  agenda: (selected: number | null = null) => useUi.getState().open({ kind: 'agenda', selected }),
  climate: (mode: 'in' | 'pool') => useUi.getState().open({ kind: 'climate', mode, range: lastRange }),
  people: () => useUi.getState().open({ kind: 'people' }),
}

export function SidebarOverlays() {
  const overlay = useUi((s) => s.overlay) as Overlay | null
  if (!overlay) return null
  switch (overlay.kind) {
    case 'weather':
      return <WeatherOverlay />
    case 'agenda':
      return <AgendaOverlay selected={overlay.selected} />
    case 'climate':
      return <ClimateOverlay mode={overlay.mode} range={overlay.range} />
    case 'people':
      return <PresenceOverlay />
    case 'game':
      return config.gaming ? <GameOverlay /> : null
    case 'gameDetail':
      return <GameDetailOverlay id={overlay.id} title={overlay.title} image={overlay.image} />
  }
}
