import type { ReactNode, Ref } from 'react'
import { Icon } from '../Icon/Icon'
import styles from './CameraViewer.module.css'

export interface CameraViewerProps {
  title: string
  status: string
  /** Colored dot before the title (red = live) */
  dot?: string
  snapshot: string
  /** The live video is attached here by the app (WebRTC / HLS) */
  hostRef?: Ref<HTMLDivElement>
  sound?: { on: boolean; label: string; onToggle: () => void }
  onClose: () => void
  children?: ReactNode
  /** z-index layer: cameras 45, recorded events 46 */
  layer?: number
}

/** Full-screen camera / recording viewer. Tap outside the picture to close. */
export function CameraViewer({ title, status, dot, snapshot, hostRef, sound, onClose, layer = 45 }: CameraViewerProps) {
  return (
    <div className={styles.overlay} style={{ zIndex: layer }} onClick={onClose}>
      <div className={styles.head}>
        <div className={dot ? styles.titles : `${styles.titles} ${styles.baseline}`}>
          {dot && <span className={styles.dot} style={{ background: dot }} />}
          <span className={styles.title}>{title}</span>
          <span className={styles.status}>{status}</span>
        </div>
        <div className={styles.buttons}>
          {sound && (
            <button
              className={sound.on ? `${styles.sound} ${styles.soundOn}` : styles.sound}
              onClick={(e) => {
                e.stopPropagation()
                sound.onToggle()
              }}
            >
              <Icon name={sound.on ? 'volume_up' : 'volume_off'} size={24} />
              {sound.label}
            </button>
          )}
          <button className={styles.close} onClick={onClose} aria-label="close">
            <Icon name="close" size={26} />
          </button>
        </div>
      </div>
      <div className={styles.frame} onClick={(e) => e.stopPropagation()}>
        {snapshot && <img src={snapshot} alt="" className={styles.media} />}
        <div ref={hostRef} className={styles.host} />
      </div>
    </div>
  )
}
