import { useEffect } from 'react'
import { Icon, PosterTile, Segmented } from '@paddock/ui'
import { duration, imageUrl, type MoviesView } from '@paddock/core'
import { config } from '../config'
import { t } from '../i18n'
import { movies, useMovies } from '../stores/movies.store'
import styles from './MoviesPage.module.css'

const VIEWS: MoviesView[] = ['recent', 'unwatched', 'ondeck']

/** Plex library: sections, views, posters (inside the Cinema page). */
export function MoviesLibrary() {
  const { section, sections, view, items, loading, error } = useMovies()
  useEffect(() => movies.refresh(), [])
  const server = config.movies?.server ?? ''
  const message = error ? t('movies.unreachable') : loading ? t('movies.loading') : t('movies.empty')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Segmented options={sections.map((s) => ({ id: s, label: s }))} value={section} onChange={(s) => movies.load({ section: s })} />
        <div className={styles.right}>
          <Segmented options={VIEWS.map((v) => ({ id: v, label: t(`movies.${v}`) }))} value={view} onChange={(v) => movies.load({ view: v as MoviesView })} />
          <button className={styles.remote} onClick={movies.openRemote}>
            <Icon name="settings_remote" size={24} />
            {t('movies.remote')}
          </button>
        </div>
      </div>
      <div className={styles.grid}>
        {items.map((m) => (
          <PosterTile
            key={m.key}
            title={m.title}
            subtitle={[m.year, duration(m.durationMin)].filter(Boolean).join(' · ')}
            poster={imageUrl(server, m.poster)}
            progress={m.progress}
            watched={m.viewed}
            watchedLabel={t('movies.watched')}
            onOpen={() => movies.openSheet(m)}
          />
        ))}
        {items.length === 0 && <div className={styles.message}>{message}</div>}
      </div>
    </div>
  )
}
