import { Icon } from '../Icon/Icon'
import styles from './Screensaver.module.css'

export interface ScreensaverProps {
  time: string
  date: string
  weatherIcon: string
  outdoor: string
  indoor: string
  summary?: string
  hint: string
  /** Moves a few pixels every minute to protect the screen. */
  minute: number
  onClose: () => void
}

/** Dim clock shown after a while without touch. Always dark. */
export function Screensaver(p: ScreensaverProps) {
  const shift = `translate(${((p.minute % 5) - 2) * 8}px, ${(((p.minute * 3) % 5) - 2) * 8}px)`
  return (
    <div data-theme="dark" className={styles.saver} onClick={p.onClose}>
      <div className={styles.center} style={{ transform: shift }}>
        <div className={styles.time}>{p.time}</div>
        <div className={styles.date}>{p.date}</div>
        <div className={styles.weather}>
          <Icon name={p.weatherIcon} size={34} filled color="#a88a4c" />
          {p.outdoor}
          <span className={styles.dot} />
          <Icon name="home" size={30} />
          {p.indoor}
        </div>
        {p.summary && <p className={styles.summary}>{p.summary}</p>}
      </div>
      <div className={styles.hint}>{p.hint}</div>
    </div>
  )
}
