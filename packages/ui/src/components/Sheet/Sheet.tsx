import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../Icon/Icon'
import styles from './Sheet.module.css'

export interface SheetProps {
  /** Panel position inside the stage (default: full stage minus 24 px) */
  frame?: CSSProperties
  /** Lighter scrim for small popovers */
  light?: boolean
  className?: string
  onClose: () => void
  children: ReactNode
}

/** Dimmed backdrop + panel; tap outside to close. */
export function Sheet({ frame, light, className, onClose, children }: SheetProps) {
  return (
    <div className={light ? `${styles.scrim} ${styles.light}` : styles.scrim} onClick={onClose}>
      <div className={className ? `${styles.panel} ${className}` : styles.panel} style={frame} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function CloseButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button title={label} className={styles.close} onClick={onPress}>
      <Icon name="close" size={24} />
    </button>
  )
}
