import { AlertBar, type AlertChip } from '@paddock/ui'
import { buildAlerts, minutesOpen, type Alert } from '@paddock/core'
import { config } from '../config'
import { t } from '../i18n'
import { useCoverList } from '../stores/covers.store'
import { useGate } from '../stores/gate.store'
import { useShallow } from 'zustand/react/shallow'
import { useHass } from '../stores/hass.store'
import { useLightList } from '../stores/lights.store'
import { useClock, useMinute } from '../stores/clock.store'
import { useCameras } from '../stores/cameras.store'

const ICONS: Record<Alert['kind'], string> = {
  'gate-open': 'garage_door_open',
  offline: 'cloud_off',
  battery: 'battery_alert',
  vigilance: 'warning',
  rain: 'rainy',
  person: 'person_alert',
  doorbell: 'doorbell',
}

function chip(a: Alert): AlertChip {
  const icon = ICONS[a.kind]
  switch (a.kind) {
    case 'gate-open':
      return { icon, title: t('alert.gateOpen', { name: config.home.gate?.name ?? '' }), detail: t('gate.since', { n: a.minutes }) }
    case 'offline':
      return { icon, title: t('alert.offline'), detail: a.name }
    case 'battery':
      return { icon, title: t('alert.battery'), detail: `${a.name} · ${a.percent} %` }
    case 'vigilance':
      return { icon, title: t('alert.vigilance', { level: a.level }), detail: a.risks.join(', ') }
    case 'rain':
      return { icon, title: a.minutes === 0 ? t('alert.raining') : t('alert.rainIn', { n: a.minutes }), detail: a.text }
    case 'person':
      return { icon, title: t('alert.person'), detail: a.camera }
    case 'doorbell':
      return { icon, title: t('alert.doorbell'), detail: t('alert.doorbellDetail') }
  }
}

/** Entities the alerts look at (batteries, weather warnings, cameras). */
const a = config.home.alerts
/** Person sensors: from the alerts config, or every camera with one. */
const PEOPLE = a.people ?? (config.cameras?.list ?? []).filter((c) => c.person).map((c) => ({ name: c.name, sensor: c.person! }))
const WATCHED = [...a.batteries, ...PEOPLE.map((p) => p.sensor), a.vigilance, a.nextRain].filter((id): id is string => !!id)

export function AlertsWidget() {
  const watched = useHass(useShallow((s) => WATCHED.map((id) => s.entities[id])))
  const entities = Object.fromEntries(WATCHED.map((id, i) => [id, watched[i]]).filter(([, e]) => e))
  const lights = useLightList(config.lighting.lights)
  const covers = useCoverList()
  const gate = useGate()
  const now = useMinute() * 60000
  const ringAt = useCameras((s) => s.ringAt)
  const ringing = useClock((s) => s.now - ringAt < 120e3)

  const offline = [
    ...(gate && !gate.available ? [config.home.gate!.name] : []),
    ...lights.filter((l) => !l.available).map((l) => l.name),
    ...covers.filter((c) => !c.available).map((c) => c.name),
  ]
  const alerts = buildAlerts({
    entities,
    config: { ...config.home.alerts, people: PEOPLE },
    ringing,
    offline,
    gateOpenMinutes: gate?.state === 'open' ? minutesOpen(gate, now) : null,
    gateAlertAfter: config.home.gate?.alertAfterMinutes ?? 10,
  }).map(chip)

  // At most 3 chips: 2 + "+ N more"
  const shown = alerts.length > 3 ? [...alerts.slice(0, 2), { icon: 'more_horiz', title: t('alert.more', { n: alerts.length - 2 }), detail: t('alert.moreDetail') }] : alerts
  return <AlertBar alerts={shown} />
}
