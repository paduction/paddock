import type { ReactNode } from 'react'
import { Icon } from '../Icon/Icon'
import styles from './RoundButton.module.css'

export interface RoundButtonProps {
  icon: string
  label: string
  active?: boolean
  filled?: boolean
  onPress: () => void
}

/** Pill button with a single icon (theme, night mode, screensaver…). */
export function RoundButton({ icon, label, active = false, filled = true, onPress }: RoundButtonProps) {
  return (
    <button title={label} aria-pressed={active} className={active ? `${styles.button} ${styles.active}` : styles.button} onClick={onPress}>
      <Icon name={icon} size={24} filled={filled} />
    </button>
  )
}

export function RoundButtonGroup({ children }: { children: ReactNode }) {
  return <div className={styles.group}>{children}</div>
}
