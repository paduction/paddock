import type { CSSProperties } from 'react'
import styles from './Icon.module.css'

export interface IconProps {
  /** Material Symbols name, e.g. 'lightbulb'. */
  name: string
  size?: number
  filled?: boolean
  color?: string
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 24, filled = false, color, className, style }: IconProps) {
  return (
    <span
      aria-hidden
      className={className ? `${styles.icon} ${className}` : styles.icon}
      style={{ fontSize: size, color, fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0", ...style }}
    >
      {name}
    </span>
  )
}
