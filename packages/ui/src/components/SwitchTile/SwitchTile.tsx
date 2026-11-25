import { cva } from 'class-variance-authority'
import { Icon } from '../Icon/Icon'
import styles from './SwitchTile.module.css'

export interface SwitchTileProps {
  name: string
  icon: string
  status: string
  on: boolean
  onToggle: () => void
  /** 'large': bigger icon and title (outdoor page). */
  size?: 'normal' | 'large'
}

const tile = cva(styles.tile, { variants: { on: { true: styles.on, false: styles.off }, size: { normal: '', large: styles.large } } })

/** On/off device (projector, amplifier, plug…). */
export function SwitchTile({ name, icon, status, on, onToggle, size = 'normal' }: SwitchTileProps) {
  return (
    <button className={tile({ on, size })} onClick={onToggle} aria-pressed={on}>
      <div className={styles.top}>
        <div className={styles.iconCircle}>
          <Icon name={icon} size={size === 'large' ? 30 : 26} filled={on} />
        </div>
        <div className={styles.switch}>
          <span className={styles.knob} />
        </div>
      </div>
      <div>
        <div className={styles.name}>{name}</div>
        <div className={styles.status}>{status}</div>
      </div>
    </button>
  )
}
