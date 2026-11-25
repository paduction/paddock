import { Icon } from '../Icon/Icon'
import { CloseButton, Sheet } from '../Sheet/Sheet'
import styles from './WeatherSheet.module.css'

export type WeatherTone = 'rain' | 'sun' | 'neutral'

export interface WeatherHour {
  label: string
  icon: string
  tone: WeatherTone
  temperature: string
  rain: string
  wet: boolean
}

export interface WeatherDay extends WeatherHour {
  date: string
  min: string
  today: boolean
  /** Bar position in the min/max range, in % */
  top: number
  height: number
}

export interface WeatherSheetProps {
  icon: string
  temperature: string
  condition: string
  detail: string
  stats: { label: string; icon: string; value: string }[]
  hoursTitle: string
  hours: WeatherHour[]
  daysTitle: string
  daysLegend: string
  days: WeatherDay[]
  closeLabel: string
  onClose: () => void
}

const toneColor = (tone: WeatherTone) => (tone === 'rain' ? 'var(--pd-blue-text)' : tone === 'sun' ? 'var(--pd-accent-text)' : 'var(--pd-text-2)')

export function WeatherSheet(p: WeatherSheetProps) {
  return (
    <Sheet className={styles.panel} onClose={p.onClose}>
      <div className={styles.head}>
        <Icon name={p.icon} size={64} filled color="var(--pd-accent-text)" />
        <span className={styles.temperature}>{p.temperature}</span>
        <div className={styles.now}>
          <span className={styles.condition}>{p.condition}</span>
          <span className={styles.detail}>{p.detail}</span>
        </div>
        <div className={styles.stats}>
          {p.stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statValue}>
                <Icon name={s.icon} size={20} color="var(--pd-text-2)" />
                {s.value}
              </span>
            </div>
          ))}
        </div>
        <CloseButton label={p.closeLabel} onPress={p.onClose} />
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>{p.hoursTitle}</span>
        <div className={styles.hours}>
          {p.hours.map((h, i) => (
            <div key={i} className={styles.hour}>
              <span className={styles.hourLabel}>{h.label}</span>
              <Icon name={h.icon} size={26} filled color={toneColor(h.tone)} />
              <span className={styles.hourTemp}>{h.temperature}</span>
              <span className={styles.rain} style={{ color: h.wet ? 'var(--pd-blue-text)' : 'var(--pd-text-3)' }}>
                {h.rain}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.daysSection}>
        <div className={styles.daysHead}>
          <span className={styles.sectionTitle}>{p.daysTitle}</span>
          <span className={styles.legend}>{p.daysLegend}</span>
        </div>
        <div className={styles.days}>
          {p.days.map((d, i) => (
            <div key={i} className={styles.day} style={{ background: d.today ? 'var(--pd-surface)' : 'transparent' }}>
              <span className={styles.dayLabel} style={{ color: d.today ? 'var(--pd-accent-text)' : 'var(--pd-text)' }}>
                {d.label}
              </span>
              <span className={styles.date}>{d.date}</span>
              <Icon name={d.icon} size={26} filled color={toneColor(d.tone)} />
              <span className={styles.max}>{d.temperature}</span>
              <div className={styles.track}>
                <span className={styles.range} style={{ top: `${d.top}%`, height: `${d.height}%`, animationDelay: `${i * 30}ms` }} />
              </div>
              <span className={styles.min}>{d.min}</span>
              <span className={styles.rain} style={{ color: d.wet ? 'var(--pd-blue-text)' : 'var(--pd-text-3)' }}>
                {d.rain}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
