import { Icon } from '../Icon/Icon'
import styles from './ScheduleRow.module.css'

export interface ScheduleRowProps {
  name: string
  icon: string
  /** When it runs, e.g. "Every day · 06:00 → 08:00" */
  when: string
  /** What it does, e.g. "Pump on" */
  what: string
  enabled: boolean
  toggleLabel: string
  onToggle: () => void
  onEdit: () => void
}

/** A schedule or trigger: tap the row to change it, the switch to pause it. */
export function ScheduleRow({ name, icon, when, what, enabled, toggleLabel, onToggle, onEdit }: ScheduleRowProps) {
  return (
    <div className={enabled ? styles.row : `${styles.row} ${styles.paused}`}>
      <button className={styles.main} onClick={onEdit}>
        <span className={styles.iconCircle}>
          <Icon name={icon} size={24} filled={enabled} />
        </span>
        <span className={styles.texts}>
          <span className={styles.name}>{name}</span>
          <span className={styles.what}>{what}</span>
        </span>
        <span className={styles.when}>{when}</span>
      </button>
      <button className={styles.switch} role="switch" aria-checked={enabled} title={toggleLabel} onClick={onToggle}>
        <span className={styles.knob} />
      </button>
    </div>
  )
}
