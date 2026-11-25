import { Icon } from '../Icon/Icon'
import styles from './AlertBar.module.css'

export interface AlertChip {
  icon: string
  title: string
  detail?: string
}

/** Red banner with one chip per alert. Render nothing when there is no alert. */
export function AlertBar({ alerts }: { alerts: AlertChip[] }) {
  if (!alerts.length) return null
  return (
    <div className={styles.bar} role="alert">
      <Icon name="warning" size={24} filled color="var(--pd-coral-text)" />
      <div className={styles.chips}>
        {alerts.map((a, i) => (
          <div key={i} className={styles.chip}>
            <Icon name={a.icon} size={20} color="var(--pd-alert-icon)" />
            <span className={styles.title}>{a.title}</span>
            <span className={styles.detail}>{a.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
