import { Icon } from '../Icon/Icon'
import styles from './ActionTile.module.css'

export interface ActionTileProps {
  icon: string
  title: string
  subtitle?: string
  onPress: () => void
}

/** Big square action, e.g. "Turn everything off". */
export function ActionTile({ icon, title, subtitle, onPress }: ActionTileProps) {
  return (
    <button className={styles.tile} onClick={onPress}>
      <div className={styles.iconCircle}>
        <Icon name={icon} size={26} />
      </div>
      <div>
        <div className={styles.title}>{title}</div>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
    </button>
  )
}
