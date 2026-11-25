import { Icon } from '../Icon/Icon'
import styles from './PosterTile.module.css'

export interface PosterTileProps {
  title: string
  subtitle: string
  poster: string
  /** 0–1, shown as a bar when started */
  progress: number
  watched: boolean
  watchedLabel: string
  onOpen: () => void
}

/** Movie poster (2:3) with "watched" badge and resume progress. */
export function PosterTile({ title, subtitle, poster, progress, watched, watchedLabel, onOpen }: PosterTileProps) {
  return (
    <button className={styles.tile} onClick={onOpen}>
      <div className={styles.poster}>
        {poster && <img src={poster} alt="" loading="lazy" className={styles.image} />}
        {watched && (
          <span className={styles.badge}>
            <Icon name="check" size={15} />
            {watchedLabel}
          </span>
        )}
        {progress > 0.01 && (
          <div className={styles.progress}>
            <div className={styles.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>
      <div className={styles.text}>
        <div className={styles.title}>{title}</div>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
    </button>
  )
}
