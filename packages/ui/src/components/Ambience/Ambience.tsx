import { useEffect, useRef, useState, type CSSProperties } from 'react'
import styles from './Ambience.module.css'

/**
 * Living backgrounds for a tile: something quiet happens behind the content while a state lasts
 * (a fire while the heating runs, a water line for the pool, stirred when its pump runs).
 *
 * The host tile needs `position: relative; overflow: hidden; isolation: isolate`: the layer sits
 * above the tile's background and under its content, and never takes a touch.
 *
 * The wall tablet is slow. The water only moves by `transform` and `opacity`, each on its own element,
 * so its graphics chip does the work; the fire is painted on a small canvas (see there why).
 * Everything rests under an ancestor carrying `data-pd-still` (screensaver)
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

/*
 * The fire is drawn, not assembled from moving pieces: a flame is a shape whose outline changes all the time,
 * and no amount of stretching and tilting a fixed drawing gives that. So this one background paints on a canvas,
 * about thirty times a second, flat shapes only (a few hundred points): light work even for the wall tablet.
 *
 * What makes it read as fire:
 * - each flame dances: a wave travels up its spine, small at the foot, wide at the tip, so its curves keep changing;
 * - it breathes: its height and its width never settle, and now and then it shoots up;
 * - a draught runs through: neighbours bend the same way at the same moment;
 * - licks break off the tips, rise and thin out; a smaller amber flame sits inside each one; a few sparks fly above.
 */

const TURN = Math.PI * 2

/** A number from 0 to 1, always the same for the same pair. */
function chance(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** A value from 0 to 1 that wanders smoothly with `t` and never repeats (one per `seed`). */
function wander(t: number, seed: number): number {
  const whole = Math.floor(t)
  const part = t - whole
  const ease = part * part * (3 - 2 * part)
  return chance(whole, seed) * (1 - ease) + chance(whole + 1, seed) * ease
}

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount

interface Point {
  x: number
  y: number
}

/** A closed outline through the points, rounded at each of them except where `sharp` says so. */
function trace(path: Path2D, points: Point[], sharp: number) {
  const middle = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  path.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length - 1; i++) {
    if (i === sharp) {
      path.lineTo(points[i].x, points[i].y)
      continue
    }
    const next = i + 1 === sharp || i + 1 === points.length - 1 ? points[i + 1] : middle(points[i], points[i + 1])
    path.quadraticCurveTo(points[i].x, points[i].y, next.x, next.y)
  }
  path.lineTo(points[points.length - 1].x, points[points.length - 1].y)
  path.closePath()
}

interface Dancer {
  /** Foot: its middle and half its width */
  x: number
  foot: number
  half: number
  /** Height now */
  tall: number
  /** How far the tip swings, as a share of the height; waves along the flame; swings per second */
  sway: number
  waves: number
  speed: number
  /** Lean given by the draught, in degrees */
  lean: number
  seed: number
}

/** Where the spine of a flame is at height `s` (0 foot, 1 tip), sideways from its foot. */
function spine(f: Dancer, s: number, t: number): number {
  const first = Math.sin(TURN * (f.waves * s - f.speed * t) + f.seed)
  const second = Math.sin(TURN * (2.3 * f.waves * s - 1.9 * f.speed * t) + f.seed * 1.7)
  return f.tall * f.sway * (Math.pow(s, 1.4) * first + 0.4 * s * s * second) + Math.tan((f.lean * Math.PI) / 180) * f.tall * s * s
}

const STEPS = 14

/** Adds one flame to the path: straight foot, belly, pointed tip, bent by its spine. `ground`: where the tile ends. */
function flame(path: Path2D, f: Dancer, t: number, ground: number) {
  const left: Point[] = []
  const right: Point[] = []
  for (let i = 0; i <= STEPS; i++) {
    const s = i / STEPS
    const ripple = 1 + 0.14 * Math.sin(TURN * (1.7 * f.waves * s - 1.4 * f.speed * t) + f.seed * 2.3)
    const half = f.half * Math.pow(1 - s, 0.85) * (1 + 1.1 * s * (1 - s)) * ripple
    const x = f.x + spine(f, s, t)
    const y = f.foot - s * f.tall
    left.push({ x: x - half, y })
    right.push({ x: x + half, y })
  }
  // up the left side, over the tip (kept sharp), down the right side
  trace(path, [{ x: f.x - f.half, y: ground }, ...left, ...right.reverse().slice(1), { x: f.x + f.half, y: ground }], STEPS + 1)
}

/** Adds a lick that left its flame: a small drop, pointed upwards. */
function lick(path: Path2D, x: number, y: number, size: number, bend: number) {
  const left: Point[] = []
  const right: Point[] = []
  const steps = 6
  for (let i = 0; i <= steps; i++) {
    const s = i / steps
    const half = size * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.8) * (1 - 0.55 * s)
    const cx = x + bend * s * s
    left.push({ x: cx - half, y: y - s * size * 3 })
    right.push({ x: cx + half, y: y - s * size * 3 })
  }
  trace(path, [...left, ...right.reverse().slice(1)], steps)
}

/** One picture of the fire. `reach`: how far up the tile it goes (0…1). */
function paintFire(ctx: CanvasRenderingContext2D, width: number, height: number, reach: number, t: number, seed: number, coral: string, amber: string) {
  const band = height * reach
  const ground = height + 4
  const wind = (x: number) => 5.5 * Math.sin(0.52 * t - x * 2.2 + seed) + 3.2 * Math.sin(1.57 * t - x * 2.2 + seed * 1.7) + 2 * Math.sin(3.67 * t - x * 2.2 + seed * 2.3)
  const back = new Path2D()
  const front = new Path2D()
  const count = 9
  for (let i = 0; i < count; i++) {
    const me = seed + i * 31
    const x = (i + 0.5 + (chance(me, 1) - 0.5) / 2) / count
    // it breathes, and now and then it shoots up
    const burst = wander(t * 1.3, me + 3)
    const tall = band * mix(0.55, 1, chance(me, 2)) * (0.72 + 0.34 * wander(t * 2.4, me + 4) + (burst > 0.7 ? (burst - 0.7) * 0.9 : 0))
    const dancer: Dancer = {
      x: x * width,
      foot: height,
      half: (width * mix(0.13, 0.2, chance(me, 5))) / 2,
      tall,
      sway: mix(0.1, 0.2, chance(me, 6)),
      waves: mix(0.45, 0.8, chance(me, 7)),
      speed: mix(0.9, 1.5, chance(me, 8)),
      lean: wind(x),
      seed: me,
    }
    flame(back, dancer, t, ground)
    // the hot core follows its flame, a touch behind
    flame(front, { ...dancer, half: dancer.half * 0.5, tall: tall * 0.55 }, t - 0.06, ground)

    // a lick leaves the tip, rises and thins out, then the flame waits before the next one
    const turn = t / mix(1.0, 2.3, chance(me, 9)) + chance(me, 10)
    const life = Math.floor(turn)
    const lasts = mix(0.3, 0.5, chance(life, me + 11))
    const moment = turn - life
    if (moment < lasts) {
      const q = moment / lasts
      const up = 1 - (1 - q) * (1 - q)
      const size = dancer.half * 0.2 * Math.pow(1 - q, 1.3)
      lick(back, dancer.x + spine(dancer, 0.9, t) + dancer.lean * 0.5 * up, height - tall * 0.9 - band * mix(0.25, 0.6, chance(life, me + 12)) * up, size, dancer.lean * 0.4)
    }
  }
  // one fill per colour: flames that overlap read as a single flat shape
  ctx.globalAlpha = 0.2
  ctx.fillStyle = coral
  ctx.fill(back)
  ctx.globalAlpha = 0.17
  ctx.fillStyle = amber
  ctx.fill(front)

  // sparks: once in a while one rises above the fire and goes out
  ctx.fillStyle = amber
  for (let i = 0; i < 5; i++) {
    const me = seed + 500 + i * 17
    const turn = t / mix(2.4, 4.8, chance(me, 1)) + chance(me, 2)
    const life = Math.floor(turn)
    const lasts = mix(0.25, 0.4, chance(life, me + 3))
    const moment = turn - life
    if (moment >= lasts) continue
    const q = moment / lasts
    const up = 1 - (1 - q) * (1 - q)
    const x = mix(0.08, 0.92, chance(life, me + 4))
    ctx.globalAlpha = 0.6 * (q < 0.15 ? q / 0.15 : 1 - (q - 0.15) / 0.85)
    ctx.beginPath()
    ctx.arc(x * width + mix(-18, 18, chance(life, me + 6)) * up + wind(x) * 1.5 * up, height - band * 0.35 - mix(0.5, 1.3, chance(life, me + 7)) * band * up, (mix(2.5, 4, chance(me, 5)) * mix(1, 0.4, q)) / 2, 0, TURN)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/**
 * A fire along the bottom of the tile while `active`.
 * `height`: how far up it reaches, in % of the tile. Raise it when something opaque covers the bottom of the tile,
 * so that the flames show above it.
 */
export function Flames({ active, height = 36 }: { active: boolean; height?: number }) {
  const shown = useLinger(active)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const view = canvas.current
    const ctx = view?.getContext('2d')
    if (!shown || !view || !ctx) return
    const seed = Math.floor(Math.random() * 1000)
    const style = getComputedStyle(view)
    const coral = style.getPropertyValue('--pd-coral').trim() || '#f07a4a'
    const amber = style.getPropertyValue('--pd-accent').trim() || '#f5c451'
    const paint = (now: number) => {
      const width = view.clientWidth
      const tall = view.clientHeight
      // sharp enough on the tablet without painting four times the pixels
      const sharp = Math.min(window.devicePixelRatio || 1, 1.5)
      if (view.width !== Math.round(width * sharp) || view.height !== Math.round(tall * sharp)) {
        view.width = Math.round(width * sharp)
        view.height = Math.round(tall * sharp)
      }
      ctx.setTransform(sharp, 0, 0, sharp, 0, 0)
      ctx.clearRect(0, 0, width, tall)
      paintFire(ctx, width, tall, height / 100, now / 1000, seed, coral, amber)
    }
    // people who asked for less motion get a still fire
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return paint(0)
    let frame = 0
    let last = 0
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      // thirty pictures a second are plenty; under the screensaver the fire rests
      if (now - last < 32 || view.closest('[data-pd-still]')) return
      last = now
      paint(now)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [shown, height])
  if (!shown) return null
  return <canvas ref={canvas} className={active ? styles.flames : `${styles.flames} ${styles.leaving}`} aria-hidden />
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
