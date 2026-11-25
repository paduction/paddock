import { cva } from 'class-variance-authority'
import { Icon } from '../Icon/Icon'
import styles from './QuickAction.module.css'

export interface QuickActionProps {
  icon: string
  label: string
  detail: string
  /** done = green check for a moment after the press; active = a running mode (cinema). */
  state: 'idle' | 'done' | 'active'
  onPress: () => void
}

const button = cva(styles.button, { variants: { state: { idle: styles.idle, done: styles.done, active: styles.active } } })

export function QuickAction({ icon, label, detail, state, onPress }: QuickActionProps) {
  return (
    <button className={button({ state })} onClick={onPress}>
      <div className={styles.iconCircle}>
        <Icon name={state === 'done' ? 'check' : icon} size={28} filled />
      </div>
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.detail}>{detail}</span>
      </div>
    </button>
  )
}
