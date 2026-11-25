import { useRef, useState, type PointerEvent } from 'react'
import { cva } from 'class-variance-authority'
import { Icon } from '../Icon/Icon'
import { useStage } from '../Stage/Stage'
import { bumpScale, useTween } from '../../hooks/useTween'
import { hideValueTooltip, ripple, showValueTooltip } from '../../feedback/feedback'
import styles from './LightTile.module.css'

export type LightTileState = 'on' | 'off' | 'offline'

export interface LightTileProps {
  name: string
  icon: string
  /** Second line, already translated: "On", "Off · presence", "Offline"… */
  status: string
  state: LightTileState
  /** Brightness shown on the tile, 0–100. */
  level: number
  onToggle: () => void
  /**
   * Called while dragging ('preview') and when the finger is lifted ('commit').
   * Level 0 = the finger went past the left edge: the light should turn off.
   */
  onLevelChange: (level: number, phase: 'preview' | 'commit') => void
  /** 'large': roomier padding and title (cinema page). */
  size?: 'normal' | 'large'
}

const tile = cva(styles.tile, {
  variants: {
    state: { on: styles.on, off: styles.off, offline: styles.offline },
    lifted: { true: styles.lifted },
    size: { normal: '', large: styles.large },
  },
})

/** Pixels the finger must travel before a touch becomes a drag. */
const DRAG_THRESHOLD = 8

/** Finger position across the tile → 0–100 %. At (or past) the left edge: 0 = off. */
function levelAt(x: number, rect: DOMRect): number {
  const ratio = (x - rect.left) / rect.width
  if (ratio <= 0.01) return 0
  return Math.max(1, Math.min(100, Math.round(ratio * 100)))
}

export function LightTile({ name, icon, status, state, level, onToggle, onLevelChange, size = 'normal' }: LightTileProps) {
  const { scale } = useStage()
  const [lifted, setLifted] = useState(false)
  const drag = useRef<{ x0: number; rect: DOMRect; moved: boolean; level: number } | null>(null)

  const shown = useTween(state === 'on' ? level : 0, 70, 0.05)
  const percent = Math.min(100, Math.max(0, shown.value))
  const on = state === 'on'

  function down(e: PointerEvent<HTMLDivElement>) {
    if (state === 'offline') return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    ripple(e.clientX, e.clientY, scale)
    drag.current = { x0: e.clientX, rect: e.currentTarget.getBoundingClientRect(), moved: false, level }
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.abs(e.clientX - d.x0) < DRAG_THRESHOLD) return
    if (!d.moved) setLifted(true)
    d.moved = true
    d.level = levelAt(e.clientX, d.rect)
    // step -1 for "off" so crossing the edge always gives a haptic tick
    const step = d.level === 0 ? -1 : Math.round(d.level / 5)
    showValueTooltip(e.clientX, e.clientY, `${d.level} %`, step, scale, getComputedStyle(e.currentTarget).fontFamily)
    onLevelChange(d.level, 'preview')
  }

  function up() {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved) {
      setLifted(false)
      hideValueTooltip()
      onLevelChange(d.level, 'commit')
    } else {
      onToggle()
    }
  }

  function cancel() {
    if (drag.current?.moved) up()
    drag.current = null
  }

  return (
    <div
      role="slider"
      aria-label={name}
      aria-valuenow={on ? Math.round(level) : 0}
      aria-valuemin={0}
      aria-valuemax={100}
      className={tile({ state, lifted, size })}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    >
      <div className={styles.fill} style={{ width: `${percent}%` }} />
      <div className={styles.content}>
        <div className={styles.top}>
          <div className={styles.iconCircle}>
            <Icon name={icon} size={26} filled={on} />
          </div>
          <div className={styles.switch}>
            <span className={styles.knob} />
          </div>
        </div>
        <div className={styles.bottom}>
          <div className={styles.text}>
            <div className={styles.name}>{name}</div>
            <div className={styles.status}>{status}</div>
          </div>
          <span className={styles.percent} style={{ transform: bumpScale(shown.distance, 25, 0.16) }}>
            {on ? `${Math.round(percent)}%` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
