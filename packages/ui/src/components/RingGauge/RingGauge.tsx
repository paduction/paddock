import { useTween } from '../../hooks/useTween'
import styles from './RingGauge.module.css'

const ARC = 339.3 // 3/4 of the circle (r = 72)

/** 270° gauge with a big percentage, animated from 0 on display. */
export function RingGauge({ label, value }: { label: string; value: number }) {
  const v = useTween(Math.max(0, Math.min(100, value)), 200, 0.05, 0).value
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <div className={styles.ring}>
        <svg width="170" height="170" className={styles.svg}>
          <circle cx="85" cy="85" r="72" className={styles.track} />
          <circle cx="85" cy="85" r="72" className={styles.value} style={{ strokeDasharray: `${((ARC * v) / 100).toFixed(1)} 452.4` }} />
        </svg>
        <div className={styles.number}>
          <span className={styles.big}>{Math.round(v)}</span>
          <span className={styles.unit}>%</span>
        </div>
      </div>
    </div>
  )
}
