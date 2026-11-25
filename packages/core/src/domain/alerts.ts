import type { AlertsConfig } from '../config/schema'
import { numericState, type HassEntities } from '../ha/types'

export type Alert =
  | { kind: 'gate-open'; minutes: number }
  | { kind: 'offline'; name: string }
  | { kind: 'battery'; name: string; percent: number }
  | { kind: 'vigilance'; level: string; risks: string[] }
  | { kind: 'rain'; minutes: number; text: string }
  | { kind: 'person'; camera: string }
  | { kind: 'doorbell' }

export interface AlertInputs {
  entities: HassEntities
  config: AlertsConfig
  /** Names of offline lights / covers / gate. */
  offline: string[]
  gateOpenMinutes: number | null
  gateAlertAfter: number
  /** Someone rang in the last 2 minutes */
  ringing?: boolean
}

/** Everything worth a glance, most urgent first. */
export function buildAlerts({ entities, config, offline, gateOpenMinutes, gateAlertAfter, ringing }: AlertInputs): Alert[] {
  const urgent: Alert[] = ringing ? [{ kind: 'doorbell' }] : []
  const rest: Alert[] = []

  for (const cam of config.people ?? []) if (entities[cam.sensor]?.state === 'on') urgent.push({ kind: 'person', camera: cam.name })

  const vig = config.vigilance ? entities[config.vigilance] : undefined
  if (vig && ['Jaune', 'Orange', 'Rouge'].includes(vig.state)) {
    const risks = Object.entries(vig.attributes)
      .filter(([k, v]) => v === vig.state && !['attribution', 'friendly_name', 'icon'].includes(k))
      .map(([k]) => k.replace(/-/g, ' ').toLowerCase())
    urgent.push({ kind: 'vigilance', level: vig.state.toLowerCase(), risks })
  }

  for (const name of offline) rest.push({ kind: 'offline', name })

  for (const id of config.batteries) {
    const v = numericState(entities[id])
    if (v !== null && v < config.batteryLow) {
      const name = String(entities[id]?.attributes.friendly_name ?? id).replace(/\s*Batterie$/i, '')
      rest.push({ kind: 'battery', name, percent: Math.round(v) })
    }
  }

  const rain = config.nextRain ? entities[config.nextRain]?.attributes['1_hour_forecast'] : undefined
  if (rain) {
    const wet = Object.entries(rain as Record<string, string>)
      .map(([k, v]) => [parseInt(k), v] as const)
      .sort((a, b) => a[0] - b[0])
      .find(([, v]) => !/sec/i.test(v))
    if (wet) rest.push({ kind: 'rain', minutes: wet[0], text: wet[1] })
  }

  const gate: Alert[] = gateOpenMinutes !== null && gateOpenMinutes >= gateAlertAfter ? [{ kind: 'gate-open', minutes: gateOpenMinutes }] : []
  return [...gate, ...urgent, ...rest]
}
