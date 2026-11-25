import type { ReactNode } from 'react'
import styles from './SidePanel.module.css'

export function SidePanel({ width, children }: { width: number; children: ReactNode }) {
  return (
    <aside className={styles.panel} style={{ width }}>
      {children}
    </aside>
  )
}

/** Thin separator between panel sections. `space` = [top, bottom] margins in px. */
export function Divider({ space = [18, 6] }: { space?: [number, number] }) {
  return <div className={styles.divider} style={{ margin: `${space[0]}px 0 ${space[1]}px` }} />
}

/** Pushes its content to the bottom of the panel. */
export function PanelFooter({ children }: { children: ReactNode }) {
  return <div className={styles.footer}>{children}</div>
}

/** "Agenda ........ 1 today" */
export function PanelHeading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className={styles.heading}>
      <span className={styles.headingTitle}>{title}</span>
      <span className={styles.headingAside}>{aside}</span>
    </div>
  )
}
