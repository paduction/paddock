import styles from './Clock.module.css'

/** Big time + long date, already formatted by the app (locale). */
export function Clock({ time, date }: { time: string; date: string }) {
  return (
    <div>
      <div className={styles.time}>{time}</div>
      <div className={styles.date}>{date}</div>
    </div>
  )
}
