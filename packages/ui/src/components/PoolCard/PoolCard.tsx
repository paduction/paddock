import { Icon } from '../Icon/Icon'
import styles from './PoolCard.module.css'

/** Big pool water temperature. */
export function PoolCard({ label, temperature }: { label: string; temperature: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>
        <Icon name="pool" size={22} />
        {label}
      </span>
      <div className={styles.value}>
        <span className={styles.big}>{temperature}</span>
        <span className={styles.degree}>°</span>
      </div>
    </div>
  )
}
