import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { consolePowerCall, toConsole, type GameConsole } from '@paddock/core'
import { config } from '../config'
import { ha, haImage } from '../ha'
import { createHold } from './hold'
import { useHass } from './hass.store'

/** "Now playing" history ([time ms, state]), source of the sessions and the last game. */
export const useGameHistory = create<{ points: [number, string][]; loadedAt: number }>()(() => ({ points: [], loadedAt: 0 }))
const held = createHold<'on' | 'standby'>()

export function useConsole(): GameConsole | null {
  const cfg = config.gaming
  const a = cfg?.account ?? {}
  const ids = [cfg?.console, cfg?.power, a.status, a.lastOnline, a.nowPlaying, a.trophyLevel, a.onlineId, a.avatar, a.plus]
  const [consoleE, power, status, lastOnline, nowPlaying, trophyLevel, onlineId, avatar, plus] = useHass(useShallow((s) => ids.map((id) => (id ? s.entities[id] : undefined))))
  const heldPower = held.useValue('power')
  if (!cfg) return null
  const c = toConsole({ console: consoleE, power, status, lastOnline, nowPlaying, trophyLevel, onlineId, avatar, plus })
  return heldPower ? { ...c, power: heldPower } : c
}

/* ---------- Covers: kept on the tablet, so past games keep their artwork ---------- */

const COVERS_KEY = 'paddock.gameCovers'
type Covers = Record<string, { src: string; at: number }>
function readCovers(): Covers {
  try {
    return JSON.parse(localStorage.getItem(COVERS_KEY) || '{}')
  } catch {
    return {}
  }
}
export const useCovers = create<{ covers: Covers }>()(() => ({ covers: readCovers() }))

function saveCover(title: string, src: string) {
  const covers = { ...useCovers.getState().covers, [title]: { src, at: Date.now() } }
  // keep the 30 most recent
  const kept = Object.fromEntries(Object.entries(covers).sort((a, b) => b[1].at - a[1].at).slice(0, 30))
  useCovers.setState({ covers: kept })
  try {
    localStorage.setItem(COVERS_KEY, JSON.stringify(kept))
  } catch {
    /* storage full or blocked: the cover stays for this session */
  }
}

/** Shrinks the artwork to a small JPEG (the HA image addresses expire); keeps the address when the image cannot be read. */
const pending = new Set<string>()
function cacheCover(title: string, url: string) {
  const known = useCovers.getState().covers[title]
  if ((known && Date.now() - known.at < 7 * 864e5) || pending.has(title)) return
  pending.add(title)
  const img = new Image()
  img.crossOrigin = 'anonymous'
  // another server without CORS: keep its address when it does not expire
  img.onerror = () => {
    pending.delete(title)
    if (!url.includes('token=')) saveCover(title, url)
  }
  img.onload = () => {
    pending.delete(title)
    try {
      const size = 320
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight)
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale
      canvas.getContext('2d')!.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      saveCover(title, canvas.toDataURL('image/jpeg', 0.82))
    } catch {
      if (!url.includes('token=')) saveCover(title, url)
    }
  }
  img.src = url
}

/* ---------- History ---------- */

async function loadHistory() {
  const id = config.gaming?.account?.nowPlaying
  if (!id) return
  type Point = { s: string; lu?: number; lc?: number }
  try {
    const r = await ha.command<Record<string, Point[]>>({
      type: 'history/history_during_period',
      start_time: new Date(Date.now() - 30 * 864e5).toISOString(),
      entity_ids: [id],
      minimal_response: true,
      no_attributes: true,
    })
    const points = (r?.[id] ?? []).map((p) => [((p.lu ?? p.lc) || 0) * 1000, p.s] as [number, string])
    useGameHistory.setState({ points, loadedAt: Date.now() })
  } catch (error) {
    console.warn('[paddock] game history', error)
  }
}

export const gaming = {
  /** ps5-mqtt: wake from rest mode / back to rest mode. The button follows at once, the console takes ~20 s. */
  setPower(on: boolean) {
    const cfg = config.gaming
    const call = cfg && consolePowerCall(cfg, on)
    if (!call) return
    held.hold('power', on ? 'on' : 'standby', 30000)
    ha.call(call)
  },
  reload: loadHistory,
}

// History: at start, when the game changes, every 15 min. Covers: whenever a game shows its artwork.
let started = false
let lastState = ''
ha.onStatus((status) => {
  const cfg = config.gaming
  if (status !== 'live' || started || !cfg) return
  started = true
  loadHistory()
  setInterval(loadHistory, 15 * 60e3)
  ha.onEntities((entities) => {
    const now = cfg.account?.nowPlaying ? entities[cfg.account.nowPlaying]?.state ?? '' : ''
    if (now !== lastState) {
      lastState = now
      setTimeout(loadHistory, 2000)
    }
    const media = entities[cfg.console]
    const title = media?.attributes.media_title as string | undefined
    const picture = media?.attributes.entity_picture as string | undefined
    if (media?.state === 'playing' && title && picture) cacheCover(title, haImage(picture)!)
  })
})
