import { useEffect, useRef } from 'react'
import { CameraViewer } from '@paddock/ui'
import { loadCredentials, prettyFolder, snapshotUrl, type CameraEvent } from '@paddock/core'
import { config } from '../config'
import { formatTime, formatWeekday, t } from '../i18n'
import type { MessageKey } from '../i18n/fr'
import { playRecording, startCameraStream, type CameraStream } from '../live/camera-stream'
import { useClock } from '../stores/clock.store'
import { cameras, useCameraList, useCameras } from '../stores/cameras.store'

const kindKey = (k: string) => `events.kind.${k}` as MessageKey

/** "Salon · Personne" */
export function eventTitle(e: CameraEvent): string {
  // An "event" from the doorbell folder is a ring
  const kind = e.kind === 'event' && /^Sonnette/.test(e.dir) ? 'ring' : e.kind
  const label = t(kindKey(kind))
  return `${prettyFolder(e.dir)} · ${label === kindKey(kind) ? t('events.kind.event') : label}`
}

/** "Aujourd'hui · 11:05", "Hier · 18:20", "Mer. 18 · 09:12" */
export function eventWhen(time: number, now: number): string {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const d = new Date(time)
  const day = Math.floor((d.getTime() - today.getTime()) / 864e5)
  const label = day >= 0 ? t('events.today') : day === -1 ? t('events.yesterday') : `${formatWeekday(d)} ${d.getDate()}`
  return `${label} · ${formatTime(d)}`
}

function LiveViewer({ entity }: { entity: string }) {
  const { playing, mode, error, muted, ringAt } = useCameras()
  const now = useClock((s) => s.now)
  const camera = useCameraList().find((c) => c.entity === entity)
  const host = useRef<HTMLDivElement>(null)
  const stream = useRef<CameraStream | null>(null)

  useEffect(() => {
    if (!host.current) return
    stream.current = startCameraStream(entity, host.current, {
      onPlaying: (m) => useCameras.setState({ playing: true, mode: m }),
      onError: () => useCameras.setState({ error: true }),
      onMuted: (m) => useCameras.setState({ muted: m }),
    })
    return () => stream.current?.stop()
  }, [entity])

  const ringing = config.cameras?.doorbell?.camera === entity && now - ringAt < 120e3
  const status = (ringing ? t('cameras.ringing') : '') + (playing ? t(mode === 'hls' ? 'cameras.liveDelayed' : 'cameras.liveNow') : error ? t('cameras.snapshots') : t('cameras.connecting'))
  return (
    <CameraViewer
      title={camera?.name ?? ''}
      status={status}
      dot={playing ? 'var(--pd-coral)' : 'var(--pd-text-3)'}
      snapshot={camera?.picture ? snapshotUrl(loadCredentials().url, camera.picture, playing ? 0 : Math.floor(now / 2000)) : ''}
      hostRef={host}
      sound={{
        on: !muted,
        label: muted ? t('cameras.soundOff') : t('cameras.sound'),
        onToggle: () => {
          const on = muted
          stream.current?.setSound(on)
          useCameras.setState({ muted: !on })
        },
      }}
      onClose={cameras.close}
    />
  )
}

function RecordingViewer({ event }: { event: CameraEvent }) {
  const urls = useCameras((s) => s.urls)
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!event.video) return
    let cancelled = false
    cameras
      .resolveUrl(event.video)
      .then((url) => !cancelled && host.current && playRecording(url, host.current, (m) => useCameras.setState({ muted: m })))
      .catch((error) => console.warn('[paddock] recording', error))
    return () => {
      cancelled = true
      if (host.current) host.current.innerHTML = ''
    }
  }, [event])

  const now = Date.now()
  return (
    <CameraViewer
      layer={46}
      title={eventTitle(event)}
      status={eventWhen(event.t, now) + (event.video ? '' : t('events.pictureOnly'))}
      snapshot={event.img && urls[event.img] ? urls[event.img].url : ''}
      hostRef={host}
      onClose={cameras.closeRecording}
    />
  )
}

/** Camera live view and recordings, above every page. */
export function CameraOverlays() {
  const open = useCameras((s) => s.open)
  const openEvent = useCameras((s) => s.openEvent)
  return (
    <>
      {open && <LiveViewer key={open} entity={open} />}
      {openEvent && <RecordingViewer event={openEvent} />}
    </>
  )
}
