import { create } from 'zustand'

/**
 * Short-lived local values that win over Home Assistant right after a touch
 * (HA can take a second or two to report the new state: the UI must not jump back).
 */
export function createHold<T>() {
  const store = create<Record<string, T>>()(() => ({}))
  const timers: Record<string, ReturnType<typeof setTimeout>> = {}

  return {
    /** Shows `value` for `key` during `ms`, then lets Home Assistant take over again. */
    hold(key: string, value: T, ms: number) {
      store.setState({ [key]: value })
      clearTimeout(timers[key])
      timers[key] = setTimeout(() => store.setState({ [key]: undefined as T }), ms)
    },
    /** The held value, or undefined. Re-renders only when this key changes. */
    useValue(key: string): T | undefined {
      return store((s) => s[key])
    },
    /** Every held value (for lists). */
    useAll(): Record<string, T | undefined> {
      return store()
    },
    get(key: string): T | undefined {
      return store.getState()[key]
    },
  }
}
