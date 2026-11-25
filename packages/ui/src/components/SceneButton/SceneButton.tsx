import { cva } from 'class-variance-authority'
import { Icon } from '../Icon/Icon'
import styles from './SceneButton.module.css'

export interface SceneButtonProps {
  name: string
  icon: string
  /** Second line, already translated ("Scene", "Active"). */
  subtitle: string
  active: boolean
  onPress: () => void
}

const button = cva(styles.button, { variants: { active: { true: styles.active, false: styles.idle } } })

export function SceneButton({ name, icon, subtitle, active, onPress }: SceneButtonProps) {
  return (
    <button className={button({ active })} onClick={onPress} aria-pressed={active}>
      <div className={styles.iconCircle}>
        <Icon name={icon} size={22} filled />
      </div>
      <div>
        <div className={styles.name}>{name}</div>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
    </button>
  )
}
