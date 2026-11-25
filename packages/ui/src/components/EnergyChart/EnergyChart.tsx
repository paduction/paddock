import styles from './EnergyChart.module.css'

export interface EnergyChartProps {
  title: string
  productionLabel: string
  consumptionLabel: string
  scaleLabel: string
  /** SVG paths in a 824 × 230 box */
  production: string
  area: string
  consumption: string
  now: string
  hours: string[]
}

export const ENERGY_CHART = { width: 824, height: 230 }

/** Production (area + line) and consumption (line) over the day, drawn on display. */
export function EnergyChart(p: EnergyChartProps) {
  const { width, height } = ENERGY_CHART
  return (
    <div className={styles.card}>
      <div className={styles.legend}>
        <span className={styles.title}>{p.title}</span>
        <span className={styles.key}>
          <span className={styles.swatchProd} />
          {p.productionLabel}
        </span>
        <span className={styles.key}>
          <span className={styles.swatchCons} />
          {p.consumptionLabel}
        </span>
        <span className={styles.scale}>{p.scaleLabel}</span>
      </div>
      <div className={styles.plot}>
        <svg width={width} height={height} className={styles.svg}>
          <path d={`M0 0 H${width} M0 ${(height / 3).toFixed(1)} H${width} M0 ${((height * 2) / 3).toFixed(1)} H${width} M0 ${height} H${width}`} className={styles.grid} />
          <path d={p.area} className={styles.area} />
          <path d={p.production} pathLength={1} className={styles.prod} />
          <path d={p.consumption} pathLength={1} className={styles.cons} />
          <path d={p.now} className={styles.now} />
        </svg>
      </div>
      <div className={styles.hours}>
        {p.hours.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
    </div>
  )
}
