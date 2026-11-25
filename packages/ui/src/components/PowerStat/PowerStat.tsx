import { Icon } from '../Icon/Icon'
import styles from './PowerStat.module.css'

export interface PowerStatProps {
  title: string
  icon: string
  tone: 'accent' | 'blue'
  value: string
  unit: string
  detail: string
}

/** Small card: live power + today's total. */
export function PowerStat({ title, icon, tone, value, unit, detail }: PowerStatProps) {
  return (
    <div className={styles.card}>
      <span className={styles.title}>
        <Icon name={icon} size={22} filled color={tone === 'blue' ? 'var(--pd-blue-text)' : 'var(--pd-accent-text)'} />
        {title}
      </span>
      <div className={styles.value}>
        <span className={styles.big}>{value}</span>
        <span className={styles.unit}>{unit}</span>
      </div>
      <span className={styles.detail}>{detail}</span>
    </div>
  )
}
