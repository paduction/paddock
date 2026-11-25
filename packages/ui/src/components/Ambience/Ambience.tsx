import { useEffect, useState, type CSSProperties } from 'react'
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
  /** Seconds for one flicker, and where in it this flame starts */
  beat: number
  shift: number
}

// two rows: wide coral flames behind, smaller amber ones in front
const BACK: Flame[] = [
  { x: -8, w: 26, h: 70, beat: 2.9, shift: 0.4 },
  { x: 9, w: 24, h: 94, beat: 2.3, shift: 1.7 },
  { x: 25, w: 25, h: 62, beat: 3.1, shift: 0.9 },
  { x: 41, w: 24, h: 100, beat: 2.6, shift: 2.2 },
  { x: 57, w: 25, h: 68, beat: 2.2, shift: 0.2 },
  { x: 72, w: 24, h: 90, beat: 3.0, shift: 1.3 },
  { x: 86, w: 26, h: 64, beat: 2.5, shift: 2.6 },
]
const FRONT: Flame[] = [
  { x: -4, w: 21, h: 40, beat: 1.9, shift: 1.1 },
  { x: 13, w: 20, h: 54, beat: 2.4, shift: 0.3 },
  { x: 30, w: 21, h: 36, beat: 2.0, shift: 1.8 },
  { x: 47, w: 20, h: 56, beat: 2.7, shift: 0.7 },
  { x: 64, w: 21, h: 38, beat: 2.1, shift: 2.0 },
  { x: 81, w: 22, h: 50, beat: 2.5, shift: 1.4 },
]

// a tongue of fire: soft bent tip, straight foot so that neighbours join at the bottom
const FLAME = 'M62 2C70 6 66 18 70 28C76 42 94 52 94 74V100H6V74C6 54 26 46 34 30C40 18 50 -4 62 2Z'

function FlameRow({ flames, className }: { flames: Flame[]; className: string }) {
  return (
    <div className={className}>
      {flames.map((f, i) => (
        <svg
          key={i}
          className={`${styles.flame} ${styles.moving}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={vars({ left: `${f.x}%`, width: `${f.w}%`, height: `${f.h}%`, animationDuration: `${f.beat}s`, animationDelay: `-${f.shift}s` })}
        >
          {/* every other flame leans the other way */}
          <path d={FLAME} fill="currentColor" transform={i % 2 ? 'translate(100 0) scale(-1 1)' : undefined} />
        </svg>
      ))}
    </div>
  )
}

/** Low flames along the bottom of the tile while `active`. */
export function Flames({ active }: { active: boolean }) {
  if (!useLinger(active)) return null
  return (
    <div className={active ? styles.flames : `${styles.flames} ${styles.leaving}`} aria-hidden>
      <FlameRow flames={BACK} className={`${styles.row} ${styles.rowBack}`} />
      <FlameRow flames={FRONT} className={`${styles.row} ${styles.rowFront}`} />
    </div>
  )
}

/* ---------- Water ---------- */

// one wave is drawn twice side by side: sliding it by half its width loops without a seam
const SWELL = 'M0 10Q150 -2 300 10T600 10T900 10T1200 10V20H0Z'
const CHOP_LONG = 'M0 10Q75 -4 150 10T300 10T450 10T600 10T750 10T900 10T1050 10T1200 10V20H0Z'
const CHOP_SHORT = 'M0 10Q50 -2 100 10T200 10T300 10T400 10T500 10T600 10T700 10T800 10T900 10T1000 10T1100 10T1200 10V20H0Z'

function Wave({ path, className }: { path: string; className: string }) {
  return (
    <div className={`${styles.wave} ${styles.moving} ${className}`}>
      <svg className={styles.crest} viewBox="0 0 1200 20" preserveAspectRatio="none">
        <path d={path} fill="currentColor" />
      </svg>
      <div className={styles.depth} />
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
