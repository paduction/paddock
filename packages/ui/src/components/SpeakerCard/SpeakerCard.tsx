import type { MouseEvent } from 'react'
import { Icon } from '../Icon/Icon'
import styles from './SpeakerCard.module.css'

export interface SpeakerChip {
  label: string
  current: boolean
  available: boolean
  dot: 'off' | 'on' | 'pending'
  onPress: () => void
}

export interface SpeakerCardProps {
  name: string
  status: string
  on: boolean
  connecting: boolean
  speakers: SpeakerChip[]
  onToggle: () => void
}

/** Output speaker: power toggle + choice of speaker. */
export function SpeakerCard({ name, status, on, connecting, speakers, onToggle }: SpeakerCardProps) {
  return (
    <button className={on ? `${styles.card} ${styles.on}` : styles.card} onClick={onToggle}>
      <div className={styles.row}>
        <div className={styles.iconCircle}>
          <Icon name="speaker_group" size={26} filled />
        </div>
        <div className={styles.text}>
          <div className={styles.name}>{name}</div>
          <div className={styles.status} style={{ color: connecting ? 'var(--pd-accent-text)' : on ? 'var(--pd-on-sub)' : 'var(--pd-text-2)' }}>
            {status}
          </div>
        </div>
        <div className={styles.switch}>
          <span className={styles.knob} />
        </div>
      </div>
      <div className={styles.chips}>
        {speakers.map((s) => (
          <span
            key={s.label}
            className={s.current ? `${styles.chip} ${styles.chipCurrent}` : styles.chip}
            style={{ opacity: s.available ? 1 : 0.4 }}
            onClick={(e: MouseEvent) => {
              e.stopPropagation()
              s.onPress()
            }}
          >
            <span className={`${styles.dot} ${styles[`dot_${s.dot}`]}`} />
            {s.label}
          </span>
        ))}
      </div>
    </button>
  )
}
