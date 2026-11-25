import { useRef, type PointerEvent } from 'react'
import { Icon } from '../Icon/Icon'
import { useStage } from '../Stage/Stage'
import { haptic, ripple } from '../../feedback/feedback'
import styles from './TrackpadRemote.module.css'

export type TrackpadCommand = 'select' | 'menu' | 'up' | 'down' | 'left' | 'right'

export interface TrackpadButton {
  icon: string
  label: string
  accent?: boolean
  onPress: () => void
}

export interface TrackpadRemoteProps {
  name: string
  status: string
  hint: string
  hint2: string
  buttons: TrackpadButton[]
  /** Swipe = arrows (repeat = 1–5 for long swipes), tap = select, long press = menu. */
  onCommand: (command: TrackpadCommand, repeat: number) => void
  onClose: () => void
}

const LONG_PRESS = 600
const TAP = 18

/** Full-screen Apple TV remote: a big touch surface like the Siri Remote. */
export function TrackpadRemote(p: TrackpadRemoteProps) {
  const { scale } = useStage()
  const touch = useRef<{ x: number; y: number; long: boolean; el: HTMLElement } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  function flash(el: HTMLElement, icon: string, dx: number, dy: number) {
    const a = document.createElement('span')
    a.textContent = icon
    a.style.cssText = "position:absolute; left:50%; top:50%; font-family:'Material Symbols Rounded'; font-size:96px; line-height:1; color:#F5C451; pointer-events:none; transform:translate(-50%,-50%); opacity:0;"
    el.appendChild(a)
    try {
      a.animate(
        [
          { opacity: 0.95, transform: 'translate(-50%,-50%) scale(.9)' },
          { opacity: 0, transform: `translate(calc(-50% + ${dx * 70}px), calc(-50% + ${dy * 70}px)) scale(1.15)` },
        ],
        { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' },
      ).onfinish = () => a.remove()
    } catch {
      a.remove()
    }
  }

  function send(command: TrackpadCommand, repeat = 1) {
    haptic(10)
    p.onCommand(command, repeat)
  }

  function down(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    ripple(e.clientX, e.clientY, scale)
    const el = e.currentTarget
    touch.current = { x: e.clientX, y: e.clientY, long: false, el }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!touch.current) return
      touch.current.long = true
      flash(el, 'arrow_back', 0, 0)
      send('menu')
    }, LONG_PRESS)
  }

  function up(e: PointerEvent<HTMLDivElement>) {
    const t = touch.current
    touch.current = null
    clearTimeout(timer.current)
    if (!t || t.long) return
    const dx = (e.clientX - t.x) / scale
    const dy = (e.clientY - t.y) / scale
    const distance = Math.hypot(dx, dy)
    if (distance < TAP) {
      flash(t.el, 'radio_button_checked', 0, 0)
      send('select')
      return
    }
    const repeat = Math.min(5, 1 + Math.floor(distance / 140))
    if (Math.abs(dx) > Math.abs(dy)) {
      flash(t.el, dx > 0 ? 'chevron_right' : 'chevron_left', Math.sign(dx), 0)
      send(dx > 0 ? 'right' : 'left', repeat)
    } else {
      flash(t.el, dy > 0 ? 'expand_more' : 'expand_less', 0, Math.sign(dy))
      send(dy > 0 ? 'down' : 'up', repeat)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.head}>
        <Icon name="settings_remote" size={34} color="#F5C451" />
        <div className={styles.titles}>
          <div className={styles.name}>{p.name}</div>
          <div className={styles.status}>{p.status}</div>
        </div>
        <button className={styles.close} onClick={p.onClose} aria-label="close">
          <Icon name="close" size={26} />
        </button>
      </div>
      <div
        className={styles.pad}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={() => {
          touch.current = null
          clearTimeout(timer.current)
        }}
      >
        <div className={styles.help}>
          <Icon name="swipe" size={44} />
          <div className={styles.hint}>{p.hint}</div>
          <div className={styles.hint2}>{p.hint2}</div>
        </div>
      </div>
      <div className={styles.buttons}>
        {p.buttons.map((b) => (
          <button key={b.label} className={b.accent ? `${styles.button} ${styles.accent}` : styles.button} onClick={b.onPress}>
            <Icon name={b.icon} size={30} filled />
            {b.label}
          </button>
        ))}
      </div>
    </div>
  )
}
