import { Icon } from '../Icon/Icon'
import styles from './ModeTile.module.css'

export interface ModeTileProps {
  name: string
  icon: string
  /** What it does, e.g. "3 shutters · 2 lights" */
  summary: string
  /** Shown instead of the summary right after a press, e.g. "Started" */
  feedback?: string | null
  editLabel: string
  onRun: () => void
  onEdit: () => void
}

/** A mode ("Leaving", "Good night"): one press sets several devices; the pencil opens its settings. */
export function ModeTile({ name, icon, summary, feedback = null, editLabel, onRun, onEdit }: ModeTileProps) {
  return (
    <div className={feedback ? `${styles.tile} ${styles.started}` : styles.tile}>
      <button className={styles.run} onClick={onRun}>
        <span className={styles.iconCircle}>
          <Icon name={feedback ? 'check' : icon} size={28} filled />
        </span>
        <span className={styles.texts}>
          <span className={styles.name}>{name}</span>
          <span className={styles.summary}>{feedback ?? summary}</span>
        </span>
      </button>
      <button className={styles.edit} title={editLabel} onClick={onEdit}>
        <Icon name="edit" size={20} />
      </button>
    </div>
  )
}
