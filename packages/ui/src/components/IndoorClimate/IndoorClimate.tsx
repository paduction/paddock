import { Icon } from '../Icon/Icon'
import styles from './IndoorClimate.module.css'

export interface IndoorReading {
  label: string
  icon: string
  tone: 'accent' | 'blue'
  temperature: string
  detail: string
}

export interface IndoorClimateProps {
  title: string
  link: string
  readings: IndoorReading[]
  onPress?: () => void
}

/** Indoor temperatures, two columns. */
export function IndoorClimate({ title, link, readings, onPress }: IndoorClimateProps) {
  return (
    <button className={styles.card} onClick={onPress}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.link}>
          {link}
          <Icon name="chevron_right" size={18} />
        </span>
      </div>
      <div className={styles.grid}>
        {readings.map((r) => (
          <div key={r.label} className={styles.reading}>
            <div title={r.label} className={styles.value}>
              <Icon name={r.icon} size={20} filled className={styles.icon} color={r.tone === 'blue' ? 'var(--pd-blue)' : 'var(--pd-accent)'} />
              <span className={styles.temperature}>{r.temperature}</span>
            </div>
            <span className={styles.detail}>{r.detail}</span>
          </div>
        ))}
      </div>
    </button>
  )
}
