import { IndoorClimate, PoolChip, useTween, type IndoorReading } from '@paddock/ui'
import { numericState, type IndoorSensorConfig } from '@paddock/core'
import { config } from '../config'
import { decimal, t } from '../i18n'
import { useEntity } from '../stores/hass.store'
import { overlays } from './SidebarOverlays'

/** One temperature, animated when it changes. */
function useReading(sensor: IndoorSensorConfig): IndoorReading {
  const temperature = numericState(useEntity(sensor.temperature))
  const humidity = numericState(useEntity(sensor.humidity))
  const shown = useTween(temperature ?? 0, 500, 0.005)
  return {
    label: sensor.label,
    icon: sensor.icon,
    tone: sensor.tone,
    temperature: `${temperature === null ? '—' : decimal(shown.value)}°`,
    detail: humidity === null ? '' : t('sidebar.humidity', { n: Math.round(humidity) }),
  }
}

export function IndoorWidget() {
  // Fixed list from the config: the number of hooks never changes.
  const readings = config.sidebar.indoor.map(useReading)
  return <IndoorClimate title={t('sidebar.indoor')} link={t('sidebar.history')} readings={readings} onPress={() => overlays.climate('in')} />
}

export function PoolWidget() {
  const temperature = numericState(useEntity(config.sidebar.pool))
  const shown = useTween(temperature ?? 0, 500, 0.005)
  if (!config.sidebar.pool) return null
  return <PoolChip label={t('sidebar.pool')} temperature={`${temperature === null ? '—' : decimal(shown.value)}°`} onPress={() => overlays.climate('pool')} />
}
