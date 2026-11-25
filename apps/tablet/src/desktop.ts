/**
 * The same interface also runs in the desktop app (apps/desktop, a Tauri window on Mac, Windows and Linux).
 * This is the only place that knows about it: the shell exposes two commands, nothing else.
 */
type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>

const invoke = (globalThis as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__?.invoke

/** True in the desktop app, false on the wall tablet and in a browser. */
export const isDesktop = typeof invoke === 'function'

export function startDesktop() {
  if (!invoke) return
  // Links (sources, game pages…) open in the system browser, not inside the window
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!link || !/^https?:\/\//.test(link.href)) return
    event.preventDefault()
    invoke('open_external', { url: link.href }).catch((error) => console.warn('[paddock] link', error))
  })
  // F11: full screen, like a browser
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'F11') return
    event.preventDefault()
    invoke('toggle_fullscreen').catch((error) => console.warn('[paddock] full screen', error))
  })
}
