import { Icon } from '../Icon/Icon'
import styles from './HouseCoversCard.module.css'

export interface HouseCoversCardProps {
  title: string
  summary: string
  openLabel: string
  closeLabel: string
  onOpen: () => void
  onClose: () => void
}

/** "Whole house": open / close every cover. */
export function HouseCoversCard({ title, summary, openLabel, closeLabel, onOpen, onClose }: HouseCoversCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.summary}>{summary}</span>
      </div>
      <div className={styles.buttons}>
        <button className={styles.button} onClick={onOpen}>
          <Icon name="keyboard_double_arrow_up" size={24} />
          {openLabel}
        </button>
        <button className={styles.button} onClick={onClose}>
          <Icon name="keyboard_double_arrow_down" size={24} />
          {closeLabel}
        </button>
      </div>
    </div>
  )
}
