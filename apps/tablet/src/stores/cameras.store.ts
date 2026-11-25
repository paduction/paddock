import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { groupEvents, securityCalls, toCamera, type Camera, type CameraEvent, type EventFile } from '@paddock/core'
import { config } from '../config'
import { ha, haImage } from '../ha'
import { useHass } from './hass.store'
import { useUi } from './ui.store'

interface CamerasState {
  tab: 'live' | 'events'
  /** Camera shown full screen */
  open: string | null
  playing: boolean
  mode: 'rtc' | 'hls' | null
  error: boolean
  muted: boolean
  /** Cameras whose snapshot does not load */
  broken: Record<string, boolean>
  /** When each camera was last closed full screen: its tile fetches a new picture */
  refreshed: Record<string, number>
  ringAt: number
  securityHeld: { mode: string; until: number } | null
  events: CameraEvent[]
  eventsLoading: boolean
  eventsLoadedAt: number
  filter: string
  urls: Record<string, { url: string; expires: number }>
  openEvent: CameraEvent | null
}

export const useCameras = create<CamerasState>()(() => ({
  tab: 'live',
  open: null,
  playing: false,
  mode: null,
  error: false,
  muted: false,
  broken: {},
  refreshed: {},
  ringAt: 0,
  securityHeld: null,
  events: [],
  eventsLoading: false,
  eventsLoadedAt: 0,
  filter: 'all',
  urls: {},
  openEvent: null,
}))

export function useCameraList(): Camera[] {
  const list = config.cameras?.list ?? []
  const entities = useHass(useShallow((s) => list.flatMap((c) => [s.entities[c.entity], c.person ? s.entities[c.person] : undefined])))
  return list.map((cfg, i) => toCamera(cfg, entities[2 * i], entities[2 * i + 1]))
}

export function markBroken(entity: string, bad: boolean) {
  if (!!useCameras.getState().broken[entity] !== bad) useCameras.setState((s) => ({ broken: { ...s.broken, [entity]: bad } }))
}

/** Checks which cameras really return a picture (otherwise: placeholder instead of a broken image). */
export function probeSnapshots(cameras: Camera[]) {
  const t = Date.now()
  for (const c of cameras) {
    if (!c.available || !c.picture) continue
    const img = new Image()
    const set = (bad: boolean) => markBroken(c.entity, bad)
    img.onload = () => set(false)
    img.onerror = () => set(true)
    img.src = `${haImage(c.picture)}${c.picture.includes('?') ? '&' : '?'}t=chk${t}`
  }
}

async function resolveUrl(id: string): Promise<string> {
  const known = useCameras.getState().urls[id]
  if (known && known.expires > Date.now()) return known.url
  const r = await ha.command<{ url: string }>({ type: 'media_source/resolve_media', media_content_id: id, expires: 3600 })
  const url = haImage(r.url)!
  useCameras.setState((s) => ({ urls: { ...s.urls, [id]: { url, expires: Date.now() + 3300e3 } } }))
  return url
}

export const visibleEvents = (s: CamerasState) => s.events.filter((e) => s.filter === 'all' || e.dir === s.filter)

async function resolveThumbs() {
  for (const e of visibleEvents(useCameras.getState()).slice(0, 40)) {
    // No picture: the video's first frame will be the thumbnail
    const id = e.img ?? e.video
    if (id) await resolveUrl(id).catch(() => {})
  }
}

let ringTimer: ReturnType<typeof setTimeout>

export const cameras = {
  openCamera(entity: string) {
    useCameras.setState({ open: entity, playing: false, mode: null, error: false })
    useUi.getState().touched()
  },
  close: () =>
    useCameras.setState((s) => ({
      open: null,
      playing: false,
      mode: null,
      error: false,
      // back to the grid: show the newest picture of the camera just watched, not the one from before
      refreshed: s.open ? { ...s.refreshed, [s.open]: Date.now() } : s.refreshed,
      broken: s.open ? { ...s.broken, [s.open]: false } : s.broken,
    })),

  setTab(tab: 'live' | 'events') {
    useCameras.setState({ tab })
    if (tab === 'events' && Date.now() - useCameras.getState().eventsLoadedAt > 30e3) cameras.loadEvents()
  },

  setSecurity(mode: string) {
    const entities = config.cameras?.security
    if (!entities?.length) return
    useCameras.setState({ securityHeld: { mode, until: Date.now() + 8000 } })
    securityCalls(entities, mode).forEach((c) => ha.call(c))
  },

  async loadEvents() {
    const root = config.cameras?.eventsRoot
    if (!root || useCameras.getState().eventsLoading) return
    useCameras.setState({ eventsLoading: true })
    try {
      type Browse = { children?: { title: string; media_content_id: string; can_expand?: boolean }[] }
      const top = await ha.command<Browse>({ type: 'media_source/browse_media', media_content_id: root })
      const files: EventFile[] = []
      for (const dir of (top?.children ?? []).filter((c) => c.can_expand)) {
        try {
          const r = await ha.command<Browse>({ type: 'media_source/browse_media', media_content_id: dir.media_content_id })
          for (const c of r?.children ?? []) files.push({ dir: dir.title, name: c.title, id: c.media_content_id })
        } catch {
          /* skip this folder */
        }
      }
      useCameras.setState({ events: groupEvents(files, Date.now()), eventsLoadedAt: Date.now(), eventsLoading: false })
      resolveThumbs()
    } catch (error) {
      console.warn('[paddock] camera events', error)
      useCameras.setState({ eventsLoading: false })
    }
  },

  setFilter(filter: string) {
    useCameras.setState({ filter })
    resolveThumbs()
  },

  openRecording: (e: CameraEvent) => {
    useCameras.setState({ openEvent: e })
    useUi.getState().touched()
  },
  closeRecording: () => useCameras.setState({ openEvent: null }),
  resolveUrl,

  /** Doorbell: wake up, show the doorbell camera, close by itself after 2 min without touch. */
  ring() {
    const camera = config.cameras?.doorbell?.camera
    if (!camera) return
    useUi.setState({ saver: false, view: 'cameras', lastTouch: Date.now() })
    useCameras.setState({ ringAt: Date.now() })
    if (useCameras.getState().open !== camera) cameras.openCamera(camera)
    clearTimeout(ringTimer)
    ringTimer = setTimeout(() => {
      if (useCameras.getState().open === camera && Date.now() - useUi.getState().lastTouch > 100e3) cameras.close()
    }, 120e3)
  },
}

/** Watches the doorbell event entity: its state (a timestamp) changes at each ring. */
let lastRing: string | undefined
ha.onEntities((entities) => {
  const id = config.cameras?.doorbell?.event
  const e = id ? entities[id] : undefined
  if (!e || ['unknown', 'unavailable'].includes(e.state)) {
    if (lastRing === undefined && e) lastRing = e.state
    return
  }
  if (lastRing === undefined) {
    lastRing = e.state
    return
  }
  if (e.state !== lastRing) {
    lastRing = e.state
    const t = Date.parse(e.state)
    if (!Number.isNaN(t) && Date.now() - t < 120e3) setTimeout(cameras.ring, 0)
  }
})
