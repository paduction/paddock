import { create } from 'zustand'

/** Current time, ticking every second. Select what you need (e.g. the minute) to avoid useless renders. */
export const useClock = create<{ now: number }>()(() => ({ now: Date.now() }))

setInterval(() => useClock.setState({ now: Date.now() }), 1000)

/** Re-renders once per minute only. */
export const useMinute = () => useClock((s) => Math.floor(s.now / 60000))
