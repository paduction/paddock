import { useEffect } from 'react'
import { CameraTile, EventTile, Icon, Segmented } from '@paddock/ui'
import { cameraColumns, loadCredentials, prettyFolder, SECURITY_MODES, snapshotUrl, type CameraEvent } from '@paddock/core'
import { config } from '../config'
import { t } from '../i18n'
import type { MessageKey } from '../i18n/fr'
import { useClock } from '../stores/clock.store'
import { cameras, markBroken, probeSnapshots, useCameraList, useCameras, visibleEvents } from '../stores/cameras.store'
import { useEntity } from '../stores/hass.store'
import { eventTitle, eventWhen } from '../widgets/CameraOverlays'
import styles from './CamerasPage.module.css'

const SECURITY: Record<string, { icon: string; color: string }> = {
  Home: { icon: 'home', color: 'var(--pd-green)' },
  Away: { icon: 'shield', color: 'var(--pd-coral)' },
  Disarmed: { icon: 'lock_open', color: 'var(--pd-text-3)' },
}

function SecurityControl() {
  const main = useEntity(config.cameras?.security?.[0])
  const held = useCameras((s) => s.securityHeld)
  const now = useClock((s) => s.now)
  if (!config.cameras?.security?.length) return null
  const real = main && !['unknown', 'unavailable'].includes(main.state) ? main.state : null
  const mode = held && held.until > now ? held.mode : real
  const current = mode ? SECURITY[mode] : undefined
  return (
    <div className={styles.security}>
      <span className={styles.securityLabel} style={{ color: current?.color ?? 'var(--pd-text-3)' }}>
        <Icon name={current?.icon ?? 'shield'} size={20} filled />
        {current ? t('security.label', { mode: t(`security.${mode}` as MessageKey) }) : t('security.unavailable')}
      </span>
      <Segmented
        compact
        disabled={real === null}
        options={SECURITY_MODES.map((m) => ({ id: m, label: t(`security.${m}`), icon: SECURITY[m].icon, color: SECURITY[m].color }))}
        value={mode ?? ''}
        onChange={cameras.setSecurity}
      />
    </div>
  )
}

function LiveGrid() {
  const list = useCameraList()
  const broken = useCameras((s) => s.broken)
  const refreshed = useCameras((s) => s.refreshed)
  const now = useClock((s) => s.now)
  const base = loadCredentials().url

  // Probe every snapshot when the cameras appear, then the live ones every 6 s
  const key = list.map((c) => `${c.entity}:${c.available}:${c.picture}`).join('|')
  useEffect(() => {
    probeSnapshots(list)
    const timer = setInterval(() => probeSnapshots(list.filter((c) => c.live)), 6000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const columns = cameraColumns(list.length)
  return (
    <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {list.map((c, i) => {
        const bad = !c.available || !c.picture || !!broken[c.entity]
        // live cameras every 6 s, the others every minute (their picture changes after a detection or a live view)
        const tick = `${c.live ? Math.floor(now / (broken[c.entity] ? 20000 : 6000)) : Math.floor(now / 60000)}-${refreshed[c.entity] ?? 0}`
        return (
          <CameraTile
            key={c.entity}
            name={c.name}
            tall={list.length === 3 && i === 0}
            image={bad ? null : snapshotUrl(base, c.picture, tick)}
            placeholder={!c.available ? t('cameras.offline') : c.live ? t('cameras.noImage') : t('cameras.tapForLive')}
            dot={c.person ? 'person' : bad ? 'off' : 'ok'}
            detail={!c.available ? t('cameras.subOffline') : c.person ? t('cameras.subPerson') : broken[c.entity] ? t(c.live ? 'cameras.subNoFeed' : 'cameras.subWaiting') : t(c.live ? 'cameras.subPreview' : 'cameras.subLast')}
            onOpen={() => c.available && cameras.openCamera(c.entity)}
            onImageError={() => markBroken(c.entity, true)}
          />
        )
      })}
    </div>
  )
}

function Recordings() {
  const state = useCameras()
  const now = useClock((s) => s.now)
  const list = visibleEvents(state).slice(0, 40)
  const folders = [...new Set(state.events.map((e) => e.dir))].sort()
  const url = (id: string | null) => (id && state.urls[id] ? state.urls[id].url : '')
  return (
    <div className={styles.events}>
      <div className={styles.filters}>
        {[['all', t('events.all')], ...folders.map((d) => [d, prettyFolder(d)])].map(([id, label]) => (
          <button key={id} className={state.filter === id ? `${styles.filter} ${styles.filterOn}` : styles.filter} onClick={() => cameras.setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className={styles.eventGrid}>
        {list.map((e: CameraEvent) => (
          <EventTile key={e.key} title={eventTitle(e)} when={eventWhen(e.t, now)} thumb={url(e.img)} videoThumb={e.img ? undefined : url(e.video)} videoLabel={e.video ? t('events.video') : undefined} onOpen={() => cameras.openRecording(e)} />
        ))}
        {!list.length && <div className={styles.empty}>{state.eventsLoading ? t('events.loading') : t('events.none')}</div>}
      </div>
    </div>
  )
}

export function CamerasPage() {
  const tab = useCameras((s) => s.tab)
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Segmented
          options={[
            { id: 'live', label: t('cameras.live'), icon: 'videocam' },
            { id: 'events', label: t('cameras.events'), icon: 'photo_library' },
          ]}
          value={tab}
          onChange={(id) => cameras.setTab(id as 'live' | 'events')}
        />
        <SecurityControl />
      </div>
      {tab === 'live' ? <LiveGrid /> : <Recordings />}
    </div>
  )
}
