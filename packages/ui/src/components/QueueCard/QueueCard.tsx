import { Icon } from '../Icon/Icon'
import styles from './QueueCard.module.css'

export interface QueueItem {
  key: string
  title: string
  subtitle: string
  duration: string
  thumb: string
  icon: string
  spinning: boolean
  highlighted: boolean
  onPress: () => void
}

export interface QueueCardProps {
  label: string
  action: string
  actionIcon: string
  onAction: () => void
  items: QueueItem[]
}

/** Playlist / queue, scrollable. */
export function QueueCard({ label, action, actionIcon, onAction, items }: QueueCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <button className={styles.action} onClick={onAction}>
          <span className={styles.actionText}>{action}</span>
          <Icon name={actionIcon} size={20} />
        </button>
      </div>
      {items.map((q) => (
        <button key={q.key} className={q.highlighted ? `${styles.item} ${styles.current}` : styles.item} onClick={q.onPress}>
          <span className={styles.art}>
            {q.thumb ? <img src={q.thumb} alt="" loading="lazy" className={styles.thumb} /> : <Icon name={q.icon} size={22} filled className={q.spinning ? styles.spin : undefined} style={{ display: 'inline-block' }} />}
          </span>
          <span className={styles.text}>
            <span className={styles.title}>{q.title}</span>
            <span className={styles.subtitle}>{q.subtitle}</span>
          </span>
          <span className={styles.duration}>{q.duration}</span>
        </button>
      ))}
    </div>
  )
}
