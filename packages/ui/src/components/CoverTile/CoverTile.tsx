import { useRef, useState, type PointerEvent } from 'react'
import { cva } from 'class-variance-authority'
import { Icon } from '../Icon/Icon'
import { useStage } from '../Stage/Stage'
import { useTween } from '../../hooks/useTween'
import { hideValueTooltip, ripple, showValueTooltip } from '../../feedback/feedback'
import styles from './CoverTile.module.css'

export interface CoverTileProps {
  name: string
  available: boolean
  /** 0 = closed, 100 = open */
  position: number
  moving: 'up' | 'down' | null
  /** Status text for a position, e.g. 0 → "Closed", 45 → "Ajar". Also used for the drag tooltip. */
  statusFor: (position: number) => string
  tooltipFor: (position: number) => string
  offlineLabel: string
  draggingLabel: string
  movingLabel: (direction: 'up' | 'down') => string
  onCommand: (command: 'up' | 'stop' | 'down') => void
  /** Drag across the tile: 'preview' while moving, 'commit' when the finger is lifted. */
  onPosition: (position: number, phase: 'preview' | 'commit') => void
}

const tile = cva(styles.tile, { variants: { lifted: { true: styles.lifted } } })
const DRAG_THRESHOLD = 10
const PADDING = 16

export function CoverTile(p: CoverTileProps) {
  const { scale } = useStage()
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x0: number; rect: DOMRect; moved: boolean; position: number; pointer: number; el: HTMLElement } | null>(null)
  const tween = useTween(p.position, dragging ? 30 : 160, 0.1)
  const shown = dragging ? p.position : tween.value
  const hot = p.moving !== null || dragging

  const status = !p.available ? p.offlineLabel : dragging ? p.draggingLabel : p.moving ? p.movingLabel(p.moving) : p.statusFor(p.position)
  const statusColor = !p.available ? 'var(--pd-coral-text)' : hot ? 'var(--pd-accent-text)' : 'var(--pd-text-2)'

  function down(e: PointerEvent<HTMLDivElement>) {
    if (!p.available || (e.target as HTMLElement).closest('button')) return
    ripple(e.clientX, e.clientY, scale)
    drag.current = { x0: e.clientX, rect: e.currentTarget.getBoundingClientRect(), moved: false, position: p.position, pointer: e.pointerId, el: e.currentTarget }
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d) return
    if (!d.moved) {
      if (Math.abs(e.clientX - d.x0) < DRAG_THRESHOLD) return
      d.moved = true
      d.el.setPointerCapture?.(d.pointer)
      setDragging(true)
    }
    const width = d.rect.width - 2 * PADDING * scale
    d.position = Math.max(0, Math.min(100, Math.round(((e.clientX - d.rect.left - PADDING * scale) / width) * 20) * 5))
    showValueTooltip(e.clientX, e.clientY, p.tooltipFor(d.position), d.position, scale, getComputedStyle(e.currentTarget).fontFamily)
    p.onPosition(d.position, 'preview')
  }

  function up() {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    setDragging(false)
    hideValueTooltip()
    p.onPosition(d.position, 'commit')
  }

  const arrow = (dir: 'up' | 'down') => (p.moving === dir ? styles.arrowOn : styles.arrow)

  return (
    <div className={tile({ lifted: dragging })} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className={styles.head}>
        <div className={styles.text}>
          <div className={styles.name}>{p.name}</div>
          <div className={styles.status} style={{ color: statusColor }}>
            {status}
          </div>
        </div>
        <span className={styles.percent} style={{ color: hot ? 'var(--pd-accent-text)' : 'var(--pd-text)' }}>
          {p.available ? `${Math.round(shown)}%` : '—'}
        </span>
      </div>
      <div className={styles.bar}>
        <div className={styles.barFill} style={{ width: `${shown}%`, background: hot ? 'var(--pd-accent-text)' : 'var(--pd-cover-bar)' }} />
      </div>
      <div className={styles.buttons}>
        <button className={arrow('up')} onClick={() => p.onCommand('up')} aria-label="up">
          <Icon name="keyboard_arrow_up" size={28} />
        </button>
        <button className={styles.stop} onClick={() => p.onCommand('stop')} aria-label="stop">
          <Icon name="stop" size={20} filled />
        </button>
        <button className={arrow('down')} onClick={() => p.onCommand('down')} aria-label="down">
          <Icon name="keyboard_arrow_down" size={28} />
        </button>
      </div>
    </div>
  )
}
