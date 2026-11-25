import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import styles from './Ambience.module.css'

/**
 * Living backgrounds for a tile: something quiet happens behind the content while a state lasts
 * (flames while the heating runs, a water line for the pool, stirred when its pump runs).
 *
 * The host tile needs `position: relative; overflow: hidden; isolation: isolate`: the layer sits
 * above the tile's background and under its content, and never takes a touch.
 *
 * Only `transform` and `opacity` move, each on its own element, so a slow tablet leaves the work to
 * its graphics chip. Everything stops under an ancestor carrying `data-pd-still` (screensaver)
 * and for people who asked their system for less motion.
 */

const FADE_MS = 900

/** True while `on`, and for the time of the fade-out after it. */
function useLinger(on: boolean): boolean {
  const [kept, setKept] = useState(on)
  useEffect(() => {
    if (on) return setKept(true)
    const timer = setTimeout(() => setKept(false), FADE_MS)
    return () => clearTimeout(timer)
  }, [on])
  return on || kept
}

const vars = (values: Record<string, string>) => values as CSSProperties

/* ---------- Flames ---------- */

interface Flame {
  /** Left edge and width, % of the tile's width */
  x: number
  w: number
  /** Height, % of the flames' band */
  h: number
  /** Which of SHAPES, and whether it leans the other way */
  shape: number
  flip: boolean
}

// tongues of fire: pointed tip, straight foot so that neighbours join at the bottom
const SHAPES = [
  'M60 0C58 22 93 44 93 73V100H7V73C7 50 30 44 40 27C46 17 55 12 60 0Z',
  'M42 0C50 16 44 26 56 38C70 52 90 58 90 76V100H10V76C10 56 28 50 34 34C38 22 36 12 42 0Z',
  'M50 0C52 18 68 26 72 42C76 36 79 30 79 22C90 38 94 56 94 74V100H6V74C6 54 22 46 29 30C33 39 38 42 42 40C40 26 44 12 50 0Z',
]

const between = (min: number, max: number) => min + Math.random() * (max - min)

/** A row of flames drawn by chance: no two fires look the same, and none looks combed. */
function drawRow(count: number, width: [number, number], height: [number, number]): Flame[] {
  const step = 100 / count
  return Array.from({ length: count }, (_, i) => {
    const w = between(...width)
    return { x: i * step + step / 2 - w / 2 + between(-step / 4, step / 4), w, h: between(...height), shape: Math.floor(Math.random() * SHAPES.length), flip: Math.random() < 0.5 }
  })
}

/** Where a flame goes next: mostly small moves, now and then a lick that shoots up. */
function pose(): string {
  const lick = Math.random() < 0.18
  const tall = lick ? between(1.12, 1.3) : between(0.68, 1.06)
  return `scale(${between(0.9, 1.1).toFixed(3)}, ${tall.toFixed(3)}) skewX(${between(-9, 9).toFixed(1)}deg)`
}

/**
 * Moves each flame from one chance pose to the next, for ever: a loop would show.
 * Each move is one transform animation (the graphics chip does it); the script only picks the next pose.
 */
function useFlicker(band: RefObject<HTMLDivElement | null>, on: boolean) {
  useEffect(() => {
    const host = band.current
    if (!on || !host || !('animate' in host) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let alive = true
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const later = (run: () => void, ms: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer)
        run()
      }, ms)
      timers.add(timer)
    }
    const flicker = (flame: SVGElement) => {
      if (!alive) return
      // the screensaver is on: rest, and look again in a while
      if (flame.closest('[data-pd-still]')) return later(() => flicker(flame), 1500)
      const next = pose()
      const move = flame.animate([{ transform: flame.style.transform || 'none' }, { transform: next }], { duration: between(240, 760), easing: 'ease-in-out' })
      move.onfinish = () => {
        flame.style.transform = next
        flicker(flame)
      }
    }
    host.querySelectorAll('svg').forEach((flame) => later(() => flicker(flame), between(0, 400)))
    return () => {
      alive = false
      timers.forEach(clearTimeout)
      host.getAnimations?.({ subtree: true }).forEach((move) => move.cancel())
    }
  }, [band, on])
}

function FlameRow({ flames, className }: { flames: Flame[]; className: string }) {
  return (
    <div className={className}>
      {flames.map((f, i) => (
        <svg key={i} className={`${styles.flame} ${styles.moving}`} viewBox="0 0 100 100" preserveAspectRatio="none" style={vars({ left: `${f.x}%`, width: `${f.w}%`, height: `${f.h}%` })}>
          <path d={SHAPES[f.shape]} fill="currentColor" transform={f.flip ? 'translate(100 0) scale(-1 1)' : undefined} />
        </svg>
      ))}
    </div>
  )
}

/** Low flames along the bottom of the tile while `active`: tall coral ones behind, small amber ones in front. */
export function Flames({ active }: { active: boolean }) {
  const shown = useLinger(active)
  const band = useRef<HTMLDivElement>(null)
  const [rows] = useState(() => ({ back: drawRow(9, [15, 26], [42, 100]), front: drawRow(9, [10, 18], [20, 56]) }))
  useFlicker(band, shown)
  if (!shown) return null
  return (
    <div ref={band} className={active ? styles.flames : `${styles.flames} ${styles.leaving}`} aria-hidden>
      <FlameRow flames={rows.back} className={`${styles.row} ${styles.rowBack}`} />
      <FlameRow flames={rows.front} className={`${styles.row} ${styles.rowFront}`} />
    </div>
  )
}

/* ---------- Water ---------- */

// One wave is as wide as the tile and repeats exactly over that width. Two copies follow each other:
// when the first has left on one side, the second has taken its place. Nothing is ever wider than the tile.
const SWELL = 'M0 10Q150 -2 300 10T600 10V20H0Z'
const CHOP_LONG = 'M0 10Q75 -4 150 10T300 10T450 10T600 10V20H0Z'
const CHOP_SHORT = 'M0 10Q50 -2 100 10T200 10T300 10T400 10T500 10T600 10V20H0Z'

function Wave({ path, className }: { path: string; className: string }) {
  return (
    <div className={`${styles.wave} ${className}`}>
      {[styles.first, styles.second].map((copy) => (
        <div key={copy} className={`${styles.copy} ${copy} ${styles.moving}`}>
          <svg className={styles.crest} viewBox="0 0 600 20" preserveAspectRatio="none">
            <path d={path} fill="currentColor" />
          </svg>
          <div className={styles.depth} />
        </div>
      ))}
    </div>
  )
}

interface Bubble {
  /** % of the tile's width */
  x: number
  /** px */
  size: number
  /** Seconds to reach the surface, and where on the way this bubble starts */
  rise: number
  shift: number
}

const BUBBLES: Bubble[] = [
  { x: 8, size: 8, rise: 3.4, shift: 0.6 },
  { x: 19, size: 13, rise: 4.6, shift: 2.9 },
  { x: 31, size: 6, rise: 2.9, shift: 1.5 },
  { x: 44, size: 10, rise: 4.0, shift: 0.1 },
  { x: 57, size: 7, rise: 3.2, shift: 2.2 },
  { x: 69, size: 14, rise: 5.0, shift: 3.8 },
  { x: 80, size: 6, rise: 3.0, shift: 0.9 },
  { x: 91, size: 9, rise: 3.8, shift: 2.5 },
]

/**
 * A water line across the tile, the lower half under water. Calm by default;
 * `stirred` (a pump runs) makes it choppy and sends bubbles up.
 */
export function Water({ stirred = false }: { stirred?: boolean }) {
  const calm = useLinger(!stirred)
  const rough = useLinger(stirred)
  return (
    <div className={styles.water} aria-hidden>
      {calm && (
        <div className={stirred ? `${styles.set} ${styles.leaving}` : styles.set}>
          <Wave path={SWELL} className={styles.swellBack} />
          <Wave path={SWELL} className={styles.swellFront} />
        </div>
      )}
      {rough && (
        <div className={stirred ? styles.set : `${styles.set} ${styles.leaving}`}>
          <div className={`${styles.bob} ${styles.moving}`}>
            <Wave path={CHOP_LONG} className={styles.chopBack} />
            <Wave path={CHOP_SHORT} className={styles.chopFront} />
          </div>
          {BUBBLES.map((b, i) => (
            <div key={i} className={`${styles.rise} ${styles.moving}`} style={vars({ left: `${b.x}%`, width: `${b.size}px`, animationDuration: `${b.rise}s`, animationDelay: `-${b.shift}s` })}>
              <span className={`${styles.bubble} ${styles.moving}`} style={vars({ height: `${b.size}px`, animationDuration: `${b.rise / 2.5}s` })} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
