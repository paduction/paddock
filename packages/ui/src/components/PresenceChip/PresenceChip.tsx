import styles from './PresenceChip.module.css'

export interface Avatar {
  initial: string
  title: string
  status: 'home' | 'away' | 'untracked'
}

export interface PresenceChipProps {
  avatars: Avatar[]
  label: string
  /** At least one person is home: the label turns green. */
  someoneHome: boolean
  onPress?: () => void
}

/** "Who is home?" — overlapping avatars + a short label. */
export function PresenceChip({ avatars, label, someoneHome, onPress }: PresenceChipProps) {
  return (
    <button className={styles.chip} onClick={onPress}>
      <div className={styles.avatars}>
        {avatars.map((a) => (
          <div key={a.title} title={a.title} className={`${styles.avatar} ${styles[a.status]}`}>
            {a.initial}
          </div>
        ))}
      </div>
      <span className={someoneHome ? styles.labelHome : styles.label}>{label}</span>
    </button>
  )
}
