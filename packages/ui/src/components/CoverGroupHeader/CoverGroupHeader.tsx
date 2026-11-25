import { Icon } from '../Icon/Icon'
import styles from './CoverGroupHeader.module.css'

export interface CoverGroupHeaderProps {
  title: string
  summary: string
  /** Show open / stop / close for the whole group. */
  controls: boolean
  onCommand: (command: 'up' | 'stop' | 'down') => void
}

export function CoverGroupHeader({ title, summary, controls, onCommand }: CoverGroupHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.titles}>
        <span className={styles.title}>{title}</span>
        <span className={styles.summary}>{summary}</span>
      </div>
      {controls && (
        <div className={styles.controls}>
          <button className={styles.round} onClick={() => onCommand('up')} aria-label="up">
            <Icon name="keyboard_double_arrow_up" size={26} />
          </button>
          <button className={styles.round} onClick={() => onCommand('stop')} aria-label="stop">
            <Icon name="stop" size={22} filled />
          </button>
          <button className={styles.round} onClick={() => onCommand('down')} aria-label="down">
            <Icon name="keyboard_double_arrow_down" size={26} />
          </button>
        </div>
      )}
    </div>
  )
}
