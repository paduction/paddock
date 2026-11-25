import { useEffect, useRef, useState } from 'react'

/**
 * Smoothly follows `target` (exponential easing). Starts at `from` (default: the target, no animation on mount).
 * `tau` is the time constant in ms: smaller = snappier.
 *
 * One animation loop per value, started when the target moves and stopped once it is reached.
 * A new target while moving only updates the destination: the loop keeps running, so fast
 * finger moves never restart the clock (time steps are always 0–64 ms).
 * Returns the current value and the remaining distance (useful for a "bump" effect).
 */
export function useTween(target: number, tau = 90, epsilon = 0.02, from?: number) {
  const start = from ?? target
  const [value, setValue] = useState(start)
  const state = useRef({ value: start, target, tau, epsilon, frame: 0, last: 0 })

  useEffect(() => {
    const s = state.current
    s.target = target
    s.tau = tau
    s.epsilon = epsilon
    if (s.frame || s.value === target) return

    const step = (now: number) => {
      const dt = s.last ? Math.min(64, Math.max(0, now - s.last)) : 16
      s.last = now
      let v = s.value + (s.target - s.value) * (1 - Math.exp(-dt / s.tau))
      if (Math.abs(s.target - v) < s.epsilon) v = s.target
      s.value = v
      setValue(v)
      if (v === s.target) {
        s.frame = 0
        s.last = 0
      } else {
        s.frame = requestAnimationFrame(step)
      }
    }
    s.frame = requestAnimationFrame(step)
  }, [target, tau, epsilon])

  // Stop the loop when the component goes away
  useEffect(
    () => () => {
      cancelAnimationFrame(state.current.frame)
      state.current.frame = 0
      state.current.last = 0
    },
    [],
  )

  return { value, distance: Math.abs(target - value) }
}

/** Scale factor that grows while a value is moving: 1 at rest, up to 1 + amount. */
export function bumpScale(distance: number, range: number, amount: number): string {
  return distance < 1e-3 ? 'none' : `scale(${(1 + amount * Math.min(1, distance / range)).toFixed(3)})`
}
