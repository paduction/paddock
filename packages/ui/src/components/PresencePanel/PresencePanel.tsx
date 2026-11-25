import { Icon } from '../Icon/Icon'
import { Sheet } from '../Sheet/Sheet'
import styles from './PresencePanel.module.css'

export interface PresenceRow {
  name: string
  initial: string
  status: string
  icon: string
  tone: 'home' | 'away' | 'untracked'
}

export interface PresencePanelProps {
  title: string
  summary: string
  someoneHome: boolean
  people: PresenceRow[]
  onClose: () => void
}

/** "Who is home" popover under the avatars. */
export function PresencePanel({ title, summary, someoneHome, people, onClose }: PresencePanelProps) {
  return (
    <Sheet light className={styles.panel} frame={{ inset: 'auto', top: 84, right: 24, width: 400 }} onClose={onClose}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.summary} style={{ color: someoneHome ? 'var(--pd-green-text)' : 'var(--pd-text-3)' }}>
          {summary}
        </span>
      </div>
      {people.map((p) => (
        <div key={p.name} className={`${styles.row} ${styles[p.tone]}`}>
          <span className={styles.avatar}>{p.initial}</span>
          <div className={styles.text}>
            <div className={styles.name}>{p.name}</div>
            <div className={styles.status}>{p.status}</div>
          </div>
          <Icon name={p.icon} size={24} filled className={styles.icon} />
        </div>
      ))}
    </Sheet>
  )
}
