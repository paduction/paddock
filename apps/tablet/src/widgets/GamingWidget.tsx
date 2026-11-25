import { useEffect } from 'react'
import { GamePanel, GameSheet, type GameStatusTone } from '@paddock/ui'
import { youtubeEmbed, youtubeThumb, gameSessions, metacriticTone, numericState, playtime, sessionDuration, topGames, type GameConsole, type GameSession } from '@paddock/core'
import { useShallow } from 'zustand/react/shallow'
import { config } from '../config'
import { haImage } from '../ha'
import { decimal, formatDate, formatTime, formatWeekday, since, t } from '../i18n'
import { useMinute } from '../stores/clock.store'
import { gaming, useConsole, useCovers, useGameHistory } from '../stores/gaming.store'
import { useHass } from '../stores/hass.store'
import { loadGameInfo, useGameInfo } from '../stores/gameinfo.store'
import { keepAwake, trailerSound, videoBlocked } from './GameDetailOverlay'
import { esrb, genre } from './gameLabels'
import { useUi } from '../stores/ui.store'

const DAY = 864e5


/** "today 21:30", "yesterday 21:30", "Wed 21:30" */
function when(time: number, now: number) {
  const d = new Date(time)
  const day = (x: number) => Math.floor((new Date(x).setHours(0, 0, 0, 0) as number) / DAY)
  const diff = day(now) - day(time)
  const prefix = diff === 0 ? t('gaming.today') : diff === 1 ? t('gaming.yesterday') : formatWeekday(d)
  return `${prefix} ${formatTime(d)}`
}

/** 45 min, 1 h 40, 6 h */
export function hm(ms: number) {
  const minutes = Math.round(ms / 60e3)
  if (minutes < 60) return t('gaming.minutes', { n: minutes })
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? t('gaming.hoursMinutes', { h, m: String(m).padStart(2, '0') }) : t('gaming.hours', { h })
}

const startOfToday = (now: number) => new Date(now).setHours(0, 0, 0, 0) as number

/** What the console shows: the game being played, else the last session. */
function useGameView(c: GameConsole | null, now: number) {
  const points = useGameHistory((s) => s.points)
  const covers = useCovers((s) => s.covers)
  const sessions = gameSessions(points)
  const last = [...sessions].reverse().find((s) => !c?.game || s.title !== c.game.title || s.end !== null) ?? null
  const current = c?.game ? sessions.filter((s) => s.title === c.game!.title).at(-1) ?? null : null
  const cover = (title: string, live?: string | null) => (live ? haImage(live) ?? null : covers[title]?.src ?? null)
  return { sessions, last, current, cover }
}

/** Details of a game (fetched once, then kept on the tablet). */
function useInfo(title: string | null) {
  const info = useGameInfo((s) => (title ? s.info[title] : undefined))
  useEffect(() => {
    if (title) loadGameInfo(title)
  }, [title])
  return info ?? null
}

const score = (info: ReturnType<typeof useInfo>) => (info?.metacritic ? { value: info.metacritic, tone: metacriticTone(info.metacritic) } : undefined)

function statusOf(c: GameConsole): { label: string; tone: GameStatusTone } {
  if (c.power === 'standby') return { label: t('gaming.standby'), tone: 'standby' }
  if (c.status === 'online' || c.power === 'on') return { label: t('gaming.online'), tone: 'online' }
  if (c.status === 'away') return { label: t('gaming.away'), tone: 'away' }
  if (c.status === 'app') return { label: t('gaming.app'), tone: 'away' }
  return { label: t('gaming.offline'), tone: 'offline' }
}

/** Cinema page, right column: the game console. */
export function GamingWidget() {
  const cfg = config.gaming!
  const c = useConsole()
  const now = useMinute() * 60000
  const { sessions, last, current, cover } = useGameView(c, now)
  const info = useInfo(c?.game?.title ?? last?.title ?? null)
  if (!c) return null

  const week = (title: string) => playtime(sessions, now - 7 * DAY, now, title)
  const game = c.game
    ? {
        kicker: c.game.since ? t('gaming.playingSince', { time: since(current?.start ?? c.game.since, now) }) : t('gaming.playing'),
        active: true,
        title: c.game.title,
        detail: week(c.game.title) ? t('gaming.weekTotal', { time: hm(week(c.game.title)) }) : undefined,
        cover: cover(c.game.title, c.game.picture) ?? info?.image ?? null,
        score: score(info),
      }
    : last
      ? {
          kicker: last.end ? t('gaming.lastGameAt', { when: when(last.end, now) }) : t('gaming.lastGame'),
          active: false,
          title: last.title,
          detail: [hm(sessionDuration(last, now)), week(last.title) > sessionDuration(last, now) ? t('gaming.weekTotal', { time: hm(week(last.title)) }) : null].filter(Boolean).join(' · '),
          cover: cover(last.title) ?? info?.image ?? null,
          score: score(info),
        }
      : { kicker: t('gaming.lastGame'), active: false, title: t('gaming.noGame'), detail: t('gaming.noGameHint'), cover: null }

  const details = [c.level != null ? t('gaming.level', { n: c.level }) : null, c.plus ? t('gaming.plus') : null].filter(Boolean).join(' · ')
  return (
    <GamePanel
      title={cfg.name}
      status={statusOf(c)}
      game={game}
      onOpen={() => {
        gaming.reload()
        useUi.getState().open({ kind: 'game' })
      }}
      account={c.onlineId ? { name: c.onlineId, detail: details || (c.lastOnline ? t('gaming.seen', { ago: since(c.lastOnline, now) }) : ''), avatar: haImage(c.avatar) ?? null } : undefined}
      power={
        cfg.power
          ? c.power === 'on'
            ? { label: t('gaming.rest'), icon: 'bedtime', primary: false, enabled: true, onPress: () => gaming.setPower(false) }
            : { label: t('gaming.turnOn', { name: cfg.name }), icon: 'power_settings_new', primary: true, enabled: true, onPress: () => gaming.setPower(true) }
          : undefined
      }
    />
  )
}

/** Details sheet: game, play time, recent sessions, most played games, trophies. */
export function GameOverlay() {
  const cfg = config.gaming!
  const a = cfg.account ?? {}
  const c = useConsole()
  const now = useMinute() * 60000
  const { sessions, last, current, cover } = useGameView(c, now)
  const ids = [a.nextLevel, a.platinum, a.gold, a.silver, a.bronze]
  const [next, platinum, gold, silver, bronze] = useHass(useShallow((s) => ids.map((id) => numericState(id ? s.entities[id] : undefined))))
  const title = c?.game?.title ?? last?.title ?? null
  const info = useInfo(title)
  if (!c) return null

  const close = () => useUi.getState().open(null)
  const today = startOfToday(now)
  const focus: GameSession | null = c.game ? current : last
  const stats = title
    ? [
        { label: t(c.game ? 'gaming.thisSession' : 'gaming.lastSession'), value: focus ? hm(sessionDuration(focus, now)) : '—' },
        { label: t('gaming.todayTotal'), value: hm(playtime(sessions, today, now, title)) },
        { label: t('gaming.week'), value: hm(playtime(sessions, now - 7 * DAY, now, title)) },
      ]
    : [
        { label: t('gaming.todayTotal'), value: hm(playtime(sessions, today, now)) },
        { label: t('gaming.week'), value: hm(playtime(sessions, now - 7 * DAY, now)) },
        { label: t('gaming.month'), value: hm(playtime(sessions, now - 30 * DAY, now)) },
      ]
  const top = topGames(sessions, now - 30 * DAY, now)
  const max = top[0]?.ms ?? 1
  const recent = [...sessions].reverse().slice(0, 7)

  return (
    <GameSheet
      title={cfg.name}
      closeLabel={t('common.close')}
      onClose={close}
      game={{
        kicker: c.game ? t('gaming.playingSince', { time: since(current?.start ?? c.game.since, now) }) : last?.end ? t('gaming.lastGameAt', { when: when(last.end, now) }) : t('gaming.lastGame'),
        active: !!c.game,
        title: title ?? t('gaming.noGame'),
        cover: title ? cover(title, c.game?.picture) ?? info?.image ?? null : null,
        score: info?.metacritic ? { value: info.metacritic, tone: metacriticTone(info.metacritic), label: t('gaming.metacritic') } : undefined,
        meta: info ? [info.released?.slice(0, 4), info.genres.slice(0, 2).map(genre).join(', ')].filter(Boolean).join(' · ') || undefined : undefined,
        chips: info
          ? [
              info.esrb ? { icon: 'family_restroom', label: esrb(info.esrb) } : null,
              info.playtime ? { icon: 'schedule', label: t('gaming.avgPlaytime', { h: info.playtime }) } : null,
            ].filter((x): x is { icon: string; label: string } => !!x)
          : undefined,
        screenshots: info?.screenshots,
      }}
      about={
        info
          ? {
              title: t('gaming.about'),
              description: info.description,
              credits: [
                info.developers.length ? { label: t('gaming.developer'), value: info.developers.slice(0, 2).join(', ') } : null,
                info.publishers.length ? { label: t('gaming.publisher'), value: info.publishers.slice(0, 2).join(', ') } : null,
                info.released ? { label: t('gaming.released'), value: formatDate(new Date(info.released), { day: 'numeric', month: 'long', year: 'numeric' }) } : null,
                info.rating ? { label: t('gaming.players'), value: `${decimal(info.rating)} / 5` } : null,
              ].filter((x): x is { label: string; value: string } => !!x),
              source: {
                label: t('gaming.source'),
                links: [info.rawgUrl ? { label: 'RAWG', href: info.rawgUrl } : null, info.wikipediaUrl ? { label: 'Wikipédia', href: info.wikipediaUrl } : null].filter((x): x is { label: string; href: string } => !!x),
              },
            }
          : undefined
      }
      stats={stats}
      sessions={{
        title: t('gaming.sessions'),
        empty: t('gaming.noSessions'),
        items: recent.map((s) => ({
          key: `${s.title}-${s.start}`,
          title: s.title,
          cover: cover(s.title),
          when: s.end === null ? t('gaming.nowPlaying') : when(s.start, now),
          duration: hm(sessionDuration(s, now)),
          active: s.end === null,
        })),
      }}
      // the trailers of the game when there is one, otherwise the most played games
      videos={
        title
          ? {
              title: t('gaming.trailers'),
              empty: info ? t('gaming.noTrailer') : t('shelf.loading'),
              items: (info?.trailers ?? []).map((id) => ({ id, thumb: youtubeThumb(id), embed: youtubeEmbed(id, location.origin) })),
            }
          : undefined
      }
      videoBlocked={videoBlocked()}
      keepAwake={keepAwake}
      onVideo={trailerSound}
      top={{ title: t('gaming.mostPlayed'), empty: t('gaming.noSessions'), items: top.map((g) => ({ title: g.title, cover: cover(g.title), value: hm(g.ms), ratio: g.ms / max })) }}
      trophies={
        c.level != null
          ? {
              title: t('gaming.trophies'),
              level: t('gaming.level', { n: c.level }),
              next: next ?? 0,
              nextLabel: next != null ? t('gaming.nextLevel', { n: Math.round(next) }) : '',
              counts: [
                { label: t('gaming.platinum'), value: String(platinum ?? '—'), color: 'var(--pd-blue)' },
                { label: t('gaming.gold'), value: String(gold ?? '—'), color: 'var(--pd-accent)' },
                { label: t('gaming.silver'), value: String(silver ?? '—'), color: 'var(--pd-text-2)' },
                { label: t('gaming.bronze'), value: String(bronze ?? '—'), color: 'var(--pd-coral)' },
              ],
            }
          : undefined
      }
    />
  )
}
