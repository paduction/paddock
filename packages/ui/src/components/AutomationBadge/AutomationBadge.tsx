import { Icon } from '../Icon/Icon'
import styles from './AutomationBadge.module.css'

export interface AutomationBadgeProps {
  /** e.g. "06:00 → 08:00", "Leaving", "3 automations" */
  label: string
  /** Spoken / hover text, e.g. "Automations: Pool pump" */
  title: string
  /** Icon only (with the label as a number when there are several): for small tiles */
  compact?: boolean
  /** Every automation of this device is paused */
  paused?: boolean
  onPress: () => void
}

/** Small pill laid over a device tile: this device is driven by one or several automations; a press opens them. */
export function AutomationBadge({ label, title, compact = false, paused = false, onPress }: AutomationBadgeProps) {
  const className = [styles.badge, compact ? styles.compact : '', paused ? styles.paused : ''].join(' ')
  return (
    <button className={className} title={title} onClick={onPress}>
      <Icon name="routine" size={compact ? 18 : 18} filled={!paused} />
      {label && <span>{label}</span>}
    </button>
  )
}
