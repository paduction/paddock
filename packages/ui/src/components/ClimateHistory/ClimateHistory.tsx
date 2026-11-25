import { CloseButton, Sheet } from '../Sheet/Sheet'
import { Segmented } from '../Segmented/Segmented'
import styles from './ClimateHistory.module.css'

export interface ClimateCard {
  name: string
  color: string
  current: string
  stats: { label: string; value: string }[]
}

export interface ClimateHistoryProps {
  title: string
  ranges: { id: string; label: string }[]
  range: string
  onRange: (id: string) => void
  cards: ClimateCard[]
  /** Chart in a 1020 × 380 box */
  chart: {
    lineA: string
    areaA: string
    colorA: string
    fillA: string
    lineB?: string
    endA: number
    endB?: number
    yTicks: { label: string; top: number }[]
    target?: { top: number; label: string }
    xLabels: string[]
  }
  closeLabel: string
  onClose: () => void
}

export const HISTORY_CHART = { width: 1020, height: 380 }

export function ClimateHistory(p: ClimateHistoryProps) {
  const c = p.chart
  return (
    <Sheet className={styles.panel} onClose={p.onClose}>
      <div className={styles.head}>
        <span className={styles.title}>{p.title}</span>
        <div className={styles.ranges}>
          <Segmented options={p.ranges} value={p.range} onChange={p.onRange} />
        </div>
        <CloseButton label={p.closeLabel} onPress={p.onClose} />
      </div>
      <div className={styles.cards}>
        {p.cards.map((card) => (
          <div key={card.name} className={styles.card}>
            <div className={styles.cardMain}>
              <span className={styles.cardName}>
                <span className={styles.dot} style={{ background: card.color }} />
                {card.name}
              </span>
              <div className={styles.current}>
                <span className={styles.big}>{card.current}</span>
                <span className={styles.degree}>°</span>
              </div>
            </div>
            <div className={styles.stats}>
              {card.stats.map((s) => (
                <div key={s.label} className={styles.stat}>
                  <span className={styles.statLabel}>{s.label}</span>
                  <span className={styles.statValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.chartBox}>
        <div className={styles.plot}>
          {c.yTicks.map((y) => (
            <div key={y.label} className={styles.gridLine} style={{ top: y.top }}>
              <span className={styles.yLabel}>{y.label}°</span>
            </div>
          ))}
          {c.target && (
            <div className={styles.target} style={{ top: c.target.top }}>
              <span className={styles.targetLabel}>{c.target.label}</span>
            </div>
          )}
          <svg width={HISTORY_CHART.width} height={HISTORY_CHART.height} className={styles.svg}>
            <path d={c.areaA} className={styles.area} style={{ fill: c.fillA }} />
            {c.lineB && <path d={c.lineB} pathLength={1} className={styles.lineB} />}
            <path d={c.lineA} pathLength={1} className={styles.lineA} style={{ stroke: c.colorA }} />
          </svg>
          <span className={styles.end} style={{ top: c.endA, background: c.colorA }} />
          {c.endB !== undefined && <span className={styles.end} style={{ top: c.endB, background: 'var(--pd-blue)' }} />}
        </div>
        <div className={styles.xLabels}>
          {c.xLabels.map((x, i) => (
            <span key={i} className={styles.xLabel}>
              {x}
            </span>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
