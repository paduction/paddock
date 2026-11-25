import { Icon } from '../Icon/Icon'
import styles from './CinemaBar.module.css'

export type CinemaControl =
  | { kind: 'switch'; id: string; icon: string; label: string; on: boolean; onToggle: () => void }
  | { kind: 'screen'; id: string; label: string; status: string; down: boolean; moving: boolean; downLabel: string; upLabel: string; onCommand: (dir: 'down' | 'up') => void }

export interface CinemaBarProps {
  title: string
  /** Mode icon (default: movie) */
  icon?: string
  hint: string
  status: 'off' | 'starting' | 'on'
  /** Steps done, while starting */
  progress?: { done: number; total: number }
  onToggle: () => void
  controls: CinemaControl[]
}

/** Cinema mode in one compact row: the mode switch, then the devices it drives. */
export function CinemaBar({ title, icon = 'movie', hint, status, progress, onToggle, controls }: CinemaBarProps) {
  return (
    <div className={styles.bar}>
      <button className={`${styles.mode} ${styles[status]}`} onClick={onToggle}>
        <span className={styles.modeIcon}>
          <Icon name={icon} size={24} filled />
        </span>
        <span className={styles.modeText}>
          <span className={styles.modeTitle}>{title}</span>
          <span className={styles.modeHint}>{hint}</span>
        </span>
        {status === 'starting' && progress && (
          <span className={styles.dots}>
            {Array.from({ length: progress.total }, (_, i) => (
              <span key={i} className={i < progress.done ? `${styles.dot} ${styles.dotOn}` : styles.dot} />
            ))}
          </span>
        )}
      </button>
      <div className={styles.controls}>
        {controls.map((c) =>
          c.kind === 'switch' ? (
            <button key={c.id} className={c.on ? `${styles.chip} ${styles.chipOn}` : styles.chip} onClick={c.onToggle}>
              <Icon name={c.icon} size={20} filled={c.on} />
              {c.label}
            </button>
          ) : (
            <div key={c.id} className={c.down ? `${styles.screen} ${styles.chipOn}` : styles.screen}>
              <span className={styles.screenText}>
                <span>{c.label}</span>
                <span className={styles.screenStatus}>{c.status}</span>
              </span>
              <button className={styles.arrow} aria-label={c.downLabel} onClick={() => c.onCommand('down')}>
                <Icon name="arrow_downward" size={18} />
              </button>
              <button className={styles.arrow} aria-label={c.upLabel} onClick={() => c.onCommand('up')}>
                <Icon name="arrow_upward" size={18} />
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
