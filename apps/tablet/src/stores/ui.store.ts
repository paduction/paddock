import { create } from 'zustand'

export type ViewId = 'home' | 'lights' | 'covers' | 'cinema' | 'gaming' | 'music' | 'energy' | 'outdoor' | 'cleaning' | 'cameras' | 'automations'

/** Panel opened from the sidebar / navigation. */
export type Overlay = { kind: 'weather' } | { kind: 'agenda'; selected: number | null } | { kind: 'climate'; mode: 'in' | 'pool'; range: '24h' | '7d' | '30d' } | { kind: 'people' } | { kind: 'game' } | { kind: 'gameDetail'; id: number; title: string; image: string | null }

interface UiState {
  overlay: Overlay | null
  open: (overlay: Overlay | null) => void
  view: ViewId
  theme: 'dark' | 'light'
  night: boolean
  lastTouch: number
  saver: boolean
  openSaver: () => void
  closeSaver: () => void
  go: (view: ViewId) => void
  toggleTheme: () => void
  toggleNight: () => void
  touched: () => void
}

const startView = (new URLSearchParams(location.search).get('view') as ViewId) || 'home'

/** Navigation and display preferences of this tablet. */
export const useUi = create<UiState>()((set) => ({
  view: startView,
  theme: 'dark',
  night: false,
  lastTouch: Date.now(),
  saver: false,
  overlay: null,
  open: (overlay) => set({ overlay, lastTouch: Date.now() }),
  go: (view) => set({ view, saver: false }),
  openSaver: () => set({ saver: true }),
  closeSaver: () => set({ saver: false, view: 'home', lastTouch: Date.now() }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  toggleNight: () => set((s) => ({ night: !s.night })),
  touched: () => set({ lastTouch: Date.now() }),
}))

/** Screensaver after `idleMinutes` without a touch. */
export function watchIdle(idleMinutes: number) {
  setInterval(() => {
    const { saver, lastTouch } = useUi.getState()
    if (!saver && Date.now() - lastTouch > idleMinutes * 60e3) useUi.setState({ saver: true })
  }, 1000)
}
