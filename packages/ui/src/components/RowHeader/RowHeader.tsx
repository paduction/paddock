import styles from './RowHeader.module.css'

export interface RowHeaderProps {
  title: string
  subtitle?: string
  /** Highlights the subtitle (e.g. "2 on"). */
  highlight?: boolean
}

/** Title column on the left of a row of tiles ("Living room · 1 on"). */
export function RowHeader({ title, subtitle, highlight = false }: RowHeaderProps) {
  return (
    <div className={styles.header}>
      <span className={styles.title}>{title}</span>
      {subtitle !== undefined && <span className={highlight ? styles.highlight : styles.subtitle}>{subtitle}</span>}
    </div>
  )
}
