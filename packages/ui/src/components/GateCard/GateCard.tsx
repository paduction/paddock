import { cva } from 'class-variance-authority'
import { Icon } from '../Icon/Icon'
import styles from './GateCard.module.css'

export interface GateCardProps {
  name: string
  /** "Open", "Closed", "Opening…" — already translated */
  status: string
  since: string
  tone: 'open' | 'moving' | 'closed'
  icon: string
  buttonLabel: string
  /** Shows a spinner instead of the icon (command sent / moving). */
  busy: boolean
  onPress: () => void
}

const card = cva(styles.card, { variants: { tone: { open: styles.open, moving: styles.moving, closed: styles.closed } } })

/** Garage door / gate: big status and one button. Turns coral while open. */
export function GateCard({ name, status, since, tone, icon, buttonLabel, busy, onPress }: GateCardProps) {
  return (
    <div className={card({ tone })}>
      <div className={styles.head}>
        <div className={styles.iconCircle}>
          <Icon name={icon} size={26} filled />
        </div>
        <span className={styles.name}>{name}</span>
        <span className={styles.since}>{since}</span>
      </div>
      <div className={styles.status}>{status}</div>
      <button className={styles.button} onClick={onPress}>
        {busy ? <Icon name="progress_activity" size={22} filled className={styles.spin} /> : <Icon name={icon} size={22} filled />}
        <span>{buttonLabel}</span>
      </button>
    </div>
  )
}
