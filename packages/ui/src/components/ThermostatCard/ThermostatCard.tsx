import { useRef, type PointerEvent } from 'react'
import { Icon } from '../Icon/Icon'
import { useStage } from '../Stage/Stage'
import { bumpScale, useTween } from '../../hooks/useTween'
import { hideValueTooltip, ripple, showValueTooltip } from '../../feedback/feedback'
import styles from './ThermostatCard.module.css'

export interface ThermostatOption {
  id: string
  label: string
  icon: string
  active: boolean
}

export interface ThermostatCardProps {
  name: string
  /** Heat / Off / Auto */
  modes: ThermostatOption[]
  onMode: (id: string) => void
  current: number | null
  target: number
  /** Number → "20,5" (locale). */
  format: (value: number) => string
  status: string
  heating: boolean
  off: boolean
  /** Preset-only thermostat: label of the current preset instead of a temperature. */
  presetLabel?: string
  setpointCaption: string
  onStep: (direction: 1 | -1) => void
  /** Temperature ruler (thermostats with a target temperature). */
  ruler?: { from: number; to: number; min: number; max: number; onChange: (value: number) => void }
  /** Preset buttons (thermostats driven by presets). */
  presets?: ThermostatOption[]
  onPreset?: (id: string) => void
}

const TICKS = 21

export function ThermostatCard(p: ThermostatCardProps) {
  const target = useTween(p.target, 80, 0.005)
  const current = useTween(p.current ?? p.target, 500, 0.005)
  const moving = Math.abs(p.target - target.value) > 0.04
  const setColor = p.off ? 'var(--pd-text-3)' : moving ? 'var(--pd-accent-text)' : 'var(--pd-text)'

  return (
    <div className={p.heating && !p.off ? `${styles.card} ${styles.heating}` : styles.card}>
      <div className={styles.head}>
        <span className={styles.name}>{p.name}</span>
        <div className={styles.segments}>
          {p.modes.map((m) => (
            <button
              key={m.id}
              className={m.active ? (m.id === 'off' ? `${styles.segment} ${styles.segmentOff}` : `${styles.segment} ${styles.segmentOn}`) : styles.segment}
              onClick={() => p.onMode(m.id)}
            >
              <Icon name={m.icon} size={18} filled />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.middle}>
        <div className={styles.readout}>
          <div className={styles.currentRow}>
            <span className={styles.current}>{p.current === null ? '—' : p.format(current.value)}</span>
            <span className={styles.degree}>°</span>
          </div>
          <span className={p.heating ? `${styles.status} ${styles.statusHeating}` : styles.status}>
            <Icon name="local_fire_department" size={18} filled />
            {p.status}
          </span>
        </div>
        <div className={styles.stepper}>
          <button className={styles.round} onClick={() => p.onStep(-1)} aria-label="−">
            <Icon name="remove" size={26} />
          </button>
          <div className={styles.setpoint} style={{ width: p.presetLabel !== undefined ? 112 : 84 }}>
            <span
              className={styles.setValue}
              style={{
                fontSize: p.presetLabel !== undefined ? 24 : 32,
                color: setColor,
                transform: p.presetLabel !== undefined ? 'none' : bumpScale(target.distance, 0.5, 0.14),
              }}
            >
              {p.presetLabel ?? `${p.format(target.value)}°`}
            </span>
            <span className={styles.setCaption}>{p.setpointCaption}</span>
          </div>
          <button className={styles.round} onClick={() => p.onStep(1)} aria-label="+">
            <Icon name="add" size={26} />
          </button>
        </div>
      </div>

      {p.ruler && <Ruler {...p.ruler} target={target.value} current={p.current ?? target.value} off={p.off} format={p.format} />}

      {p.presets && (
        <div className={styles.presets}>
          {p.presets.map((preset) => (
            <button
              key={preset.id}
              className={preset.active && !p.off ? `${styles.preset} ${styles.presetOn}` : styles.preset}
              style={!preset.active && p.off ? { color: 'var(--pd-text-3)' } : undefined}
              onClick={() => p.onPreset?.(preset.id)}
            >
              <Icon name={preset.icon} size={22} filled />
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface RulerProps {
  from: number
  to: number
  min: number
  max: number
  target: number
  current: number
  off: boolean
  format: (value: number) => string
  onChange: (value: number) => void
}

/** Ticks every 0.5°, drag anywhere to set the temperature. */
function Ruler({ from, to, min, max, target, current, off, format, onChange }: RulerProps) {
  const { scale } = useStage()
  const rect = useRef<DOMRect | null>(null)
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - from) / (to - from)) * 100))}%`

  function at(e: PointerEvent<HTMLDivElement>) {
    const r = rect.current
    if (!r) return
    const raw = from + ((e.clientX - r.left) / r.width) * (to - from)
    const value = Math.max(Math.max(from, min), Math.min(Math.min(to, max), Math.round(raw * 2) / 2))
    showValueTooltip(e.clientX, e.clientY, `${format(value)}°`, value, scale, getComputedStyle(e.currentTarget).fontFamily)
    onChange(value)
  }

  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const v = from + i * ((to - from) / (TICKS - 1))
    const major = i % 2 === 0
    const lit = !off && v <= target + 0.001
    const near = off ? 0 : Math.max(0, 1 - Math.abs(v - target) / 1.25) * 8
    const color = lit ? (major ? 'var(--pd-accent-text)' : 'var(--pd-tick-on)') : major ? 'var(--pd-tick-off)' : 'var(--pd-track)'
    return <span key={i} className={styles.tick} style={{ height: (major ? 34 : 18) + near, background: color }} />
  })

  const labels = []
  for (let v = from; v <= to; v += 2) labels.push(<span key={v}>{v}°</span>)

  return (
    <div
      className={styles.ruler}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        rect.current = e.currentTarget.getBoundingClientRect()
        ripple(e.clientX, e.clientY, scale)
        at(e)
      }}
      onPointerMove={at}
      onPointerUp={() => {
        rect.current = null
        hideValueTooltip()
      }}
      onPointerCancel={() => {
        rect.current = null
        hideValueTooltip()
      }}
    >
      <div className={styles.ticks}>{ticks}</div>
      <span className={styles.targetMark} style={{ left: pos(target) }} />
      <span className={styles.currentMark} style={{ left: pos(current) }} />
      <div className={styles.labels}>{labels}</div>
    </div>
  )
}
