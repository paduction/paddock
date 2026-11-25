import { Icon } from '../Icon/Icon'
import styles from './EventTile.module.css'

export interface EventTileProps {
  title: string
  when: string
  thumb: string
  /** Video whose first frame serves as thumbnail when there is no picture */
  videoThumb?: string
  videoLabel?: string
  onOpen: () => void
}

/** Recorded detection: thumbnail, camera, time. */
export function EventTile({ title, when, thumb, videoThumb, videoLabel, onOpen }: EventTileProps) {
  return (
    <button className={styles.tile} onClick={onOpen}>
      <div className={styles.thumb}>
        {thumb && <img src={thumb} alt="" loading="lazy" className={styles.image} />}
        {!thumb && videoThumb && <video src={`${videoThumb}#t=0.5`} preload="metadata" muted playsInline className={styles.image} />}
        {videoLabel && (
          <span className={styles.video}>
            <Icon name="play_circle" size={16} filled />
            {videoLabel}
          </span>
        )}
      </div>
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.when}>{when}</span>
      </div>
    </button>
  )
}
