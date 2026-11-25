import { Icon } from '../Icon/Icon'
import styles from './WeatherSummary.module.css'

export interface WeatherSummaryProps {
  title: string
  link: string
  icon: string
  temperature: string
  condition: string
  detail: string
  onPress?: () => void
}

export function WeatherSummary({ title, link, icon, temperature, condition, detail, onPress }: WeatherSummaryProps) {
  return (
    <button className={styles.card} onClick={onPress}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.link}>
          {link}
          <Icon name="chevron_right" size={18} />
        </span>
      </div>
      <div className={styles.row}>
        <Icon name={icon} size={36} filled color="var(--pd-accent-text)" />
        <span className={styles.temperature}>{temperature}</span>
        <div className={styles.side}>
          <span className={styles.condition}>{condition}</span>
          <span className={styles.detail}>{detail}</span>
        </div>
      </div>
    </button>
  )
}
