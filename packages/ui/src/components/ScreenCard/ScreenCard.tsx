import { Icon } from '../Icon/Icon'
import styles from './ScreenCard.module.css'

export interface ScreenCardProps {
  name: string
  status: string
  down: boolean
  moving: 'up' | 'down' | null
  downLabel: string
  upLabel: string
  onCommand: (command: 'down' | 'stop' | 'up') => void
}

/** Motorised projection screen. */
export function ScreenCard({ name, status, down, moving, downLabel, upLabel, onCommand }: ScreenCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={down ? `${styles.iconCircle} ${styles.iconOn}` : styles.iconCircle}>
          <Icon name="fit_screen" size={26} />
        </div>
        <div>
          <div className={styles.name}>{name}</div>
          <div className={styles.status} style={{ color: moving ? 'var(--pd-accent-text)' : 'var(--pd-text-2)' }}>
            {status}
          </div>
        </div>
      </div>
      <div className={styles.buttons}>
        <button className={moving === 'down' ? styles.moveOn : styles.move} title={downLabel} onClick={() => onCommand('down')}>
          <Icon name="keyboard_arrow_down" size={28} />
        </button>
        <button className={styles.stop} onClick={() => onCommand('stop')} aria-label="stop">
          <Icon name="stop" size={20} filled />
        </button>
        <button className={moving === 'up' ? styles.moveOn : styles.move} title={upLabel} onClick={() => onCommand('up')}>
          <Icon name="keyboard_arrow_up" size={28} />
        </button>
      </div>
    </div>
  )
}
