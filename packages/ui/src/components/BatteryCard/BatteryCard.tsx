import { Icon } from '../Icon/Icon'
import styles from './BatteryCard.module.css'

export interface BatteryCardProps {
  title: string
  kwh: string
  note: string
  /** 0–100, only for a real battery with a known capacity */
  percent?: number
}

export function BatteryCard({ title, kwh, note, percent }: BatteryCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.title}>
        <Icon name="battery_charging_80" size={22} filled color="var(--pd-green-text)" />
        {title}
      </span>
      <div>
        <div className={styles.value}>
          <span className={styles.big}>{kwh}</span>
          <span className={styles.unit}>kWh</span>
        </div>
        <div className={styles.note}>{note}</div>
      </div>
      {percent !== undefined && (
        <div>
          <div className={styles.bar}>
            <div className={styles.fill} style={{ width: `${percent}%` }} />
          </div>
          <div className={styles.percent}>{percent} %</div>
        </div>
      )}
    </div>
  )
}
