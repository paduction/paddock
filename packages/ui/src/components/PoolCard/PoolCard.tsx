import { Water } from '../Ambience/Ambience'
import { Icon } from '../Icon/Icon'
import styles from './PoolCard.module.css'

/** Big pool water temperature, over a water line that gets choppy while the pump runs (`pumping`). */
export function PoolCard({ label, temperature, pumping = false }: { label: string; temperature: string; pumping?: boolean }) {
  return (
    <div className={styles.card}>
      <Water stirred={pumping} />
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
