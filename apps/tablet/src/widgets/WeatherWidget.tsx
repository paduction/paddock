import { WeatherSummary, useTween } from '@paddock/ui'
import { isNight, numericState, toWeatherNow, weatherIcon } from '@paddock/core'
import { config } from '../config'
import { decimal, t } from '../i18n'
import type { MessageKey } from '../i18n/fr'
import { useEntity } from '../stores/hass.store'
import { useForecast } from '../stores/weather.store'
import { useMinute } from '../stores/clock.store'
import { overlays } from './SidebarOverlays'

export function WeatherWidget() {
  const { weather, sun, outdoorTemperature, outdoorHumidity } = config.sidebar
  const now = toWeatherNow(useEntity(weather))
  const sunEntity = useEntity(sun)
  const temperature = numericState(useEntity(outdoorTemperature))
  const humidity = numericState(useEntity(outdoorHumidity))
  const days = useForecast((s) => s.days)
  const minute = useMinute()
  const shown = useTween(temperature ?? 0, 500, 0.005)

  const conditionKey = `weather.${now.condition}` as MessageKey
  return (
    <WeatherSummary
      title={t('sidebar.outdoor')}
      link={days ? t('sidebar.forecastDays', { n: days }) : t('sidebar.forecast')}
      icon={weatherIcon(now.condition, isNight(sunEntity, new Date(minute * 60000)))}
      temperature={`${temperature === null ? '—' : decimal(shown.value)}°`}
      condition={now.condition && t(conditionKey) !== conditionKey ? t(conditionKey) : '—'}
      detail={humidity === null ? '' : t('sidebar.humidity', { n: Math.round(humidity) })}
      onPress={overlays.weather}
    />
  )
}
