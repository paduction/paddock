import type { MouseEvent } from 'react'
import { Icon } from '../Icon/Icon'
import styles from './Segmented.module.css'

export interface SegmentOption {
  id: string
  label: string
  icon?: string
  /** Background when selected (default: accent) */
  color?: string
  /** Shown greyed out, cannot be chosen */
  disabled?: boolean
}

export interface SegmentedProps {
  options: SegmentOption[]
  value: string
  onChange: (id: string) => void
  /** 'overlay': translucent background, for use on top of images. */
  tone?: 'default' | 'overlay'
  size?: 'md' | 'sm'
  /** Tighter padding (icon + label options) */
  compact?: boolean
  disabled?: boolean
  /** Options share the whole width */
  stretch?: boolean
}

/** One choice among a few, as pills in a dark track. */
export function Segmented({ options, value, onChange, tone = 'default', size = 'md', compact = false, disabled = false, stretch = false }: SegmentedProps) {
  return (
    <div className={`${styles.track} ${tone === 'overlay' ? styles.overlay : ''} ${stretch ? styles.stretch : ''}`}>
      {options.map((o) => (
        <button
          key={o.id}
          className={`${styles.option} ${size === 'sm' ? styles.sm : ''} ${compact ? styles.compact : ''} ${o.id === value ? (o.color ? styles.colored : styles.active) : ''}`}
          style={{ ...(o.id === value && o.color ? { background: o.color } : {}), ...(disabled ? { opacity: 0.5 } : o.disabled ? { opacity: 0.35 } : {}) }}
          onClick={(e: MouseEvent) => {
            e.stopPropagation()
            if (!disabled && !o.disabled) onChange(o.id)
          }}
        >
          {o.icon && <Icon name={o.icon} size={compact ? 18 : 20} filled />}
          {o.label}
        </button>
      ))}
    </div>
  )
}
