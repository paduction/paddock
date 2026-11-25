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

/*
 * What makes a drawn fire read as fire, and how each point is done with transforms only:
 * - it flows upwards: tongues shoot up fast and sink back slower, and licks break off, rise, thin out and vanish;
 * - a flame bends, it does not rock like a cut-out: each one is a body plus a tongue that moves more and faster;
 * - a draught runs through it: neighbours lean the same way at the same moment (`wind`);
 * - it has a hot core: a smaller amber flame inside each coral one, and a few sparks above.
 * Every part gets one long animation (LOOP) made of chance poses, built once: no script runs while it burns,
 * and with some forty parts on different beats nobody can see the loop come round.
 */

const LOOP = 12000
const TURN = Math.PI * 2

interface Fire {
  /** Centre and width, % of the tile's width */
  x: number
  w: number
  /** Height, % of the flames' band */
  h: number
  shape: number
  flip: boolean
  /** Where the tongue stands on the body, % of the flame's width */
  lean: number
}

// bodies: pointed tip, straight foot so that neighbours join at the bottom
const BODIES = [
  'M60 0C58 22 93 44 93 73V100H7V73C7 50 30 44 40 27C46 17 55 12 60 0Z',
  'M42 0C50 16 44 26 56 38C70 52 90 58 90 76V100H10V76C10 56 28 50 34 34C38 22 36 12 42 0Z',
  'M50 0C52 18 68 26 72 42C76 36 79 30 79 22C90 38 94 56 94 74V100H6V74C6 54 22 46 29 30C33 39 38 42 42 40C40 26 44 12 50 0Z',
]
// the tongue: slender, bent, its round foot hidden in the body
const TONGUE = 'M45 0C56 18 45 30 58 45C70 58 84 66 84 82C84 94 70 100 50 100S16 94 16 82C16 62 35 54 39 36C41 24 38 12 45 0Z'
// a lick that broke off
const LICK = 'M50 0C60 30 84 50 84 70C84 88 70 100 50 100S16 88 16 70C16 50 40 30 50 0Z'

const between = (min: number, max: number) => min + Math.random() * (max - min)
const fixed = (value: number) => value.toFixed(2)

function drawFires(count: number): Fire[] {
  const step = 100 / count
  return Array.from({ length: count }, (_, i) => ({
    x: (i + 0.5) * step + between(-step / 4, step / 4),
    w: between(20, 31),
    h: between(48, 92),
    shape: Math.floor(Math.random() * BODIES.length),
    flip: Math.random() < 0.5,
    lean: between(-14, 14),
  }))
}

type Wind = (ms: number, x: number) => number

/** The draught, in degrees of lean: a few slow swings on top of each other, drifting across the tile. Comes round with LOOP. */
function drawWind(): Wind {
  const swings = [
    { size: 5.5, turns: 1 },
    { size: 3.2, turns: 3 },
    { size: 2, turns: 7 },
  ].map((swing) => ({ ...swing, phase: between(0, TURN) }))
  return (ms, x) => swings.reduce((sum, s) => sum + s.size * Math.sin(TURN * ((s.turns * ms) / LOOP - x / 280) + s.phase), 0)
}

/** Moments of the loop, in ms, with an uneven gap between them. */
function beats(min: number, max: number): number[] {
  const out = [0]
  for (let ms = between(min, max); ms < LOOP - min; ms += between(min, max)) out.push(ms)
  return out
}

/** Closes a list of poses into a loop: it ends as it starts. */
const looped = (frames: Keyframe[]): Keyframe[] => [...frames, { ...frames[0], offset: 1 }]

/** The body breathes and leans a little with the draught. */
function bodyFrames(wind: Wind, x: number): Keyframe[] {
  return looped(
    beats(420, 900).map((ms) => ({
      offset: ms / LOOP,
      easing: 'ease-in-out',
      transform: `skewX(${fixed(0.35 * wind(ms, x) + between(-1.5, 1.5))}deg) scale(${fixed(between(0.95, 1.05))}, ${fixed(between(0.9, 1.08))})`,
    })),
  )
}

/** The tongue flickers several times a second: up fast, down slower, thinner when taller, leaning hard with the draught. */
function tongueFrames(wind: Wind, x: number): Keyframe[] {
  const moments = beats(120, 330)
  const tall = moments.map(() => (Math.random() < 0.2 ? between(1.12, 1.38) : between(0.5, 1)))
  return looped(
    moments.map((ms, i) => ({
      offset: ms / LOOP,
      easing: tall[(i + 1) % tall.length] > tall[i] ? 'cubic-bezier(0.15, 0.75, 0.3, 1)' : 'ease-in',
      transform: `skewX(${fixed(1.3 * wind(ms, x) + between(-6, 6))}deg) scale(${fixed(1.1 - 0.32 * (tall[i] - 0.5) + between(-0.05, 0.05))}, ${fixed(tall[i])})`,
    })),
  )
}

/**
 * Something that leaves the fire again and again: it appears, rises, shrinks and fades, then waits unseen.
 * `rise` and `drift` are in the unit given (the part's own size in %, or px).
 */
function risingFrames(wind: Wind, x: number, o: { gap: [number, number]; life: [number, number]; rise: [number, number]; spread: number; unit: string; end: string }): Keyframe[] {
  const rest = { opacity: 0, transform: 'none' }
  const frames: Keyframe[] = [{ ...rest, offset: 0 }]
  for (let ms = between(0, o.gap[1]); ms + o.life[1] < LOOP; ms += between(...o.gap)) {
    const life = between(...o.life)
    const from = between(-o.spread, o.spread)
    const to = from + wind(ms, x) * (o.spread / 12)
    const up = between(...o.rise)
    frames.push({ offset: ms / LOOP, opacity: 0, easing: 'ease-out', transform: `translate(${fixed(from)}${o.unit}, 0) scale(1)` })
    frames.push({ offset: (ms + life * 0.15) / LOOP, opacity: 1, easing: 'ease-out', transform: `translate(${fixed(from + (to - from) * 0.3)}${o.unit}, ${fixed(-up * 0.3)}${o.unit}) scale(1)` })
    frames.push({ offset: (ms + life) / LOOP, opacity: 0, transform: `translate(${fixed(to)}${o.unit}, ${fixed(-up)}${o.unit}) ${o.end}` })
    ms += life
  }
  return [...frames, { ...rest, offset: 1 }]
}

const FRAMES: Record<string, (wind: Wind, x: number) => Keyframe[]> = {
  body: bodyFrames,
  tongue: tongueFrames,
  lick: (wind, x) => risingFrames(wind, x, { gap: [350, 1900], life: [380, 700], rise: [140, 300], spread: 45, unit: '%', end: 'scale(0.15, 0.4)' }),
  spark: (wind, x) => risingFrames(wind, x, { gap: [700, 3600], life: [900, 1700], rise: [70, 190], spread: 26, unit: 'px', end: 'scale(0.4)' }),
}

/** Sets the fire going: one endless animation per part (see the note above). Rests under the screensaver. */
function useBurning(band: RefObject<HTMLDivElement | null>, on: boolean) {
  useEffect(() => {
    const host = band.current
    if (!on || !host || !('animate' in host) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const wind = drawWind()
    const moves = [...host.querySelectorAll<HTMLElement | SVGElement>('[data-part]')].map((part) =>
      part.animate(FRAMES[part.dataset.part!](wind, Number(part.dataset.x)), { duration: LOOP, iterations: Infinity }),
    )
    let resting = false
    const watch = setInterval(() => {
      const still = !!host.closest('[data-pd-still]')
      if (still === resting) return
      resting = still
      moves.forEach((move) => (still ? move.pause() : move.play()))
    }, 1500)
    return () => {
      clearInterval(watch)
      moves.forEach((move) => move.cancel())
    }
  }, [band, on])
}

/** One flame: body, tongue and, for the big ones, the lick that breaks off. `size` shrinks it into a core. */
function FireShape({ fire, size = 1, lick = false }: { fire: Fire; size?: number; lick?: boolean }) {
  const part = (name: string, className: string, path: string, style?: CSSProperties) => (
    <svg data-part={name} data-x={fire.x} className={`${className} ${styles.moving}`} viewBox="0 0 100 100" preserveAspectRatio="none" style={style}>
      <path d={path} fill="currentColor" transform={fire.flip ? 'translate(100 0) scale(-1 1)' : undefined} />
    </svg>
  )
  return (
    <div className={styles.fire} style={vars({ left: `${fire.x - (fire.w * size) / 2}%`, width: `${fire.w * size}%`, height: `${fire.h * size}%` })}>
      {lick && part('lick', styles.lick, LICK, vars({ left: `${37 + fire.lean}%` }))}
      {part('tongue', styles.tongue, TONGUE, vars({ left: `${20 + fire.lean}%` }))}
      {part('body', styles.body, BODIES[fire.shape])}
    </div>
  )
}

/**
 * A fire along the bottom of the tile while `active`.
 * `height`: how far up it reaches, in % of the tile. Raise it when something opaque covers the bottom of the tile,
 * so that the flames show above it.
 */
export function Flames({ active, height = 36 }: { active: boolean; height?: number }) {
  const shown = useLinger(active)
  const band = useRef<HTMLDivElement>(null)
  const [drawn] = useState(() => ({
    fires: drawFires(7),
    sparks: Array.from({ length: 5 }, () => ({ x: between(8, 92), size: between(3, 5) })),
  }))
  useBurning(band, shown)
  if (!shown) return null
  return (
    <div ref={band} className={active ? styles.flames : `${styles.flames} ${styles.leaving}`} style={vars({ height: `${height}%` })} aria-hidden>
      <div className={`${styles.row} ${styles.rowBack}`}>
        {drawn.fires.map((fire, i) => (
          <FireShape key={i} fire={fire} lick />
        ))}
      </div>
      <div className={`${styles.row} ${styles.rowFront}`}>
        {drawn.fires.map((fire, i) => (
          <FireShape key={i} fire={fire} size={0.55} />
        ))}
      </div>
      <div className={`${styles.row} ${styles.rowSparks}`}>
        {drawn.sparks.map((spark, i) => (
          <span key={i} data-part="spark" data-x={spark.x} className={`${styles.spark} ${styles.moving}`} style={vars({ left: `${spark.x}%`, width: `${spark.size}px`, height: `${spark.size}px` })} />
        ))}
      </div>
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
