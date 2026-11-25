import { MovieDetail, Segmented, TrackpadRemote } from '@paddock/ui'
import { availableTvs, duration, imageUrl, remainingMinutes } from '@paddock/core'
import { useShallow } from 'zustand/react/shallow'
import { config } from '../config'
import { decimal, t } from '../i18n'
import { useHass } from '../stores/hass.store'
import { movies, useMovies } from '../stores/movies.store'
import { useClock } from '../stores/clock.store'
import styles from './MovieOverlays.module.css'

const SEP = '   ·   '

/** Movie sheet + full-screen Apple TV remote, drawn above every page. */
export function MovieOverlays() {
  const { open, sheet, tv, sentAt, remote } = useMovies()
  const cfg = config.movies
  const tvEntities = useHass(useShallow((s) => (cfg?.tvs ?? []).map((x) => s.entities[x.media])))
  const now = useClock((s) => s.now)
  if (!cfg) return null
  const server = cfg.server
  const entities = Object.fromEntries(cfg.tvs.map((x, i) => [x.media, tvEntities[i]]))

  let detail = null
  if (open) {
    const m = sheet ?? open
    const sent = now - sentAt < 40e3
    const remain = remainingMinutes(m)
    const tvs = availableTvs(cfg, entities)
    const current = cfg.tvs[tv] ?? cfg.tvs[0]
    detail = (
      <MovieDetail
        title={m.title}
        poster={imageUrl(server, sheet?.poster ?? m.poster)}
        backdrop={imageUrl(server, m.backdrop)}
        meta={[m.year, duration(m.durationMin), m.rating ? `★ ${decimal(Number(m.rating))}` : '', m.contentRating && m.contentRating !== 'Not Rated' ? m.contentRating : '', sheet?.studio]
          .filter(Boolean)
          .join(SEP)}
        genres={m.genres ?? []}
        summary={m.summary || (sheet ? '' : t('movies.loading'))}
        credits={[sheet?.directors?.length ? t('movies.directedBy', { names: sheet.directors.join(', ') }) : '', sheet?.countries?.join(', ') ?? ''].filter(Boolean).join(SEP)}
        cast={(sheet?.cast ?? []).slice(0, 8).map((c) => ({ name: c.name, role: c.role ?? '', photo: imageUrl(server, c.photo) }))}
        target={
          tvs.length > 1 ? (
            <div className={styles.target}>
              <span className={styles.targetLabel}>{t('movies.watchOn')}</span>
              <Segmented tone="overlay" size="sm" options={tvs.map((i) => ({ id: String(i), label: cfg.tvs[i].name }))} value={String(tv)} onChange={(id) => movies.chooseTv(Number(id))} />
            </div>
          ) : undefined
        }
        playLabel={sent ? t('movies.opening') : t('movies.openPlex', { where: current.where })}
        playBusy={sent}
        hint={sent ? t('movies.hintSent') : remain ? t('movies.hintResume', { time: duration(remain) }) : t('movies.hintPick')}
        onPlay={movies.play}
        onClose={movies.closeSheet}
      />
    )
  }

  let trackpad = null
  const remoteTv = remote !== null ? cfg.tvs[remote] : undefined
  if (remoteTv) {
    const e = entities[remoteTv.media]
    const a = e?.attributes ?? {}
    const playing = e?.state === 'playing'
    const status = !e
      ? t('tv.notFound')
      : e.state === 'off'
        ? t('tv.off')
        : e.state === 'unavailable'
          ? t('tv.unreachable')
          : [a.app_name, a.media_title, playing ? t('tv.playing') : e.state === 'paused' ? t('tv.paused') : ''].filter(Boolean).join(' · ') || t('tv.on')
    trackpad = (
      <TrackpadRemote
        name={remoteTv.remoteTitle}
        status={status}
        hint={t('tv.swipe')}
        hint2={t('tv.longPress')}
        onCommand={(command, repeat) => movies.key(command, repeat)}
        onClose={movies.closeRemote}
        buttons={[
          { icon: 'arrow_back', label: t('tv.back'), onPress: () => movies.key('menu') },
          { icon: 'home', label: t('tv.home'), onPress: () => movies.key('home') },
          { icon: playing ? 'pause' : 'play_arrow', label: t(playing ? 'tv.pause' : 'tv.play'), accent: true, onPress: () => movies.key('play_pause') },
          { icon: 'replay_10', label: t('tv.rewind'), onPress: () => movies.key('skip_backward') },
          { icon: 'forward_10', label: t('tv.forward'), onPress: () => movies.key('skip_forward') },
          { icon: 'volume_down', label: t('tv.volDown'), onPress: () => movies.key('volume_down') },
          { icon: 'volume_up', label: t('tv.volUp'), onPress: () => movies.key('volume_up') },
        ]}
      />
    )
  }

  return (
    <>
      {detail}
      {trackpad}
    </>
  )
}
