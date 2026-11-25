import type { CameraConfig } from '../config/schema'
import { isAvailable, type HassEntity, type ServiceCall } from '../ha/types'

export interface Camera extends Omit<CameraConfig, 'person'> {
  available: boolean
  /** Person detected right now */
  person: boolean
  /** entity_picture (relative or absolute), null when none */
  picture: string | null
}

export function toCamera(cfg: CameraConfig, e?: HassEntity, person?: HassEntity): Camera {
  return { ...cfg, available: isAvailable(e), person: person?.state === 'on', picture: e?.attributes.entity_picture ?? null }
}

/** Snapshot URL with a cache-busting tick. */
export function snapshotUrl(base: string, picture: string | null, tick: number | string): string {
  if (!picture) return ''
  const url = /^https?:/.test(picture) ? picture : base.replace(/\/$/, '') + picture
  return `${url}${url.includes('?') ? '&' : '?'}t=${tick}`
}

/** Grid layout: 1 column for one camera, 2 up to 4, then 3. */
export function cameraColumns(count: number): number {
  return count <= 1 ? 1 : count <= 4 ? 2 : 3
}

/* ---- Security modes (Eufy-like select entities) ---- */

export const SECURITY_MODES = ['Home', 'Away', 'Disarmed'] as const

export function securityCalls(entities: string[], mode: string): ServiceCall[] {
  return entities.map((id) => ({ domain: 'select', service: 'select_option', target: id, data: { option: mode } }))
}

/* ---- Recorded events (media_source folders: <camera>/<YYYY-MM-DD_HH-MM-SS>_<camera>_<kind>.<ext>) ---- */

export interface EventFile {
  dir: string
  name: string
  id: string
}

export interface CameraEvent {
  key: string
  dir: string
  /** ms */
  t: number
  tEnd: number
  kind: string
  /** media_content_id of the picture and of the video, when present */
  img: string | null
  video: string | null
}

const FILE = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})_(.+)\.(jpe?g|png|mp4)$/i

/** Groups the files of one detection (same camera, < 60 s apart) and keeps the last 7 days. */
export function groupEvents(files: EventFile[], now: number): CameraEvent[] {
  const parsed = files
    .map((f) => {
      const m = FILE.exec(f.name)
      if (!m) return null
      const t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime()
      const rest = m[7]
      const prefix = `${f.dir}_`
      const kind = (rest.startsWith(prefix) ? rest.slice(prefix.length) : rest.split('_').pop()!).toLowerCase()
      return { ...f, t, kind, isVideo: m[8].toLowerCase() === 'mp4' }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a.t - b.t)
  // Periodic "live" snapshots are not events, but they can illustrate one that has no picture
  const snapshots = parsed.filter((x) => x.kind === 'live' && !x.isVideo)
  const detections = parsed.filter((x) => !(x.kind === 'live' && !x.isVideo))

  const events: CameraEvent[] = []
  for (const f of detections) {
    const last = [...events].reverse().find((e) => e.dir === f.dir && f.t - e.tEnd < 60e3)
    if (last) {
      last.tEnd = f.t
      if (f.isVideo) last.video = f.id
      else {
        last.img = f.id
        if (last.kind === 'motion' && f.kind !== 'motion') last.kind = f.kind
      }
    } else {
      events.push({ key: f.dir + f.t, dir: f.dir, t: f.t, tEnd: f.t, kind: f.kind, img: f.isVideo ? null : f.id, video: f.isVideo ? f.id : null })
    }
  }
  for (const e of events) {
    if (e.img) continue
    const near = snapshots.find((x) => x.dir === e.dir && x.t >= e.t - SNAPSHOT_GAP && x.t <= e.tEnd + SNAPSHOT_GAP)
    if (near) e.img = near.id
  }
  // No global limit: a busy camera must not push the others (e.g. the doorbell) out of the list
  const week = now - 7 * 864e5
  return events.filter((e) => e.t > week).sort((a, b) => b.t - a.t)
}

/** A live snapshot taken this close to an event can serve as its thumbnail. */
const SNAPSHOT_GAP = 60e3

/** Folder names → readable ("Sonnette_Entree" → "Sonnette"). */
export const prettyFolder = (dir: string) => dir.replace(/_/g, ' ').replace(/^Sonnette .*/, 'Sonnette')
