import { Icon } from '../Icon/Icon'
import styles from './CameraTile.module.css'

export interface CameraTileProps {
  name: string
  detail: string
  /** Snapshot URL; null shows the placeholder */
  image: string | null
  placeholder: string
  dot: 'person' | 'ok' | 'off'
  tall?: boolean
  onOpen: () => void
  onImageError?: () => void
  onImageLoad?: () => void
}

export function CameraTile(p: CameraTileProps) {
  return (
    <button className={styles.tile} style={p.tall ? { gridRow: 'span 2' } : undefined} onClick={p.onOpen}>
      {p.image ? (
        <img src={p.image} alt="" className={styles.image} onError={p.onImageError} onLoad={p.onImageLoad} />
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.placeholderInner}>
            <Icon name="videocam_off" size={56} />
            <span>{p.placeholder}</span>
          </div>
        </div>
      )}
      <div className={styles.label}>
        <span className={`${styles.dot} ${styles[p.dot]}`} />
        <span className={styles.name}>{p.name}</span>
        <span className={styles.detail}>{p.detail}</span>
      </div>
      <div className={styles.expand}>
        <Icon name="open_in_full" size={22} />
      </div>
    </button>
  )
}
