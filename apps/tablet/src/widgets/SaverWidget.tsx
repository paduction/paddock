import { Screensaver } from '@paddock/ui'
import { isNight, numericState, toWeatherNow, UNKNOWN_STATES, weatherIcon } from '@paddock/core'
import { config } from '../config'
import { decimal, formatLongDate, formatTime, t } from '../i18n'
import { useMinute } from '../stores/clock.store'
import { useEntity } from '../stores/hass.store'
import { useUi } from '../stores/ui.store'

export function SaverWidget() {
  const minute = useMinute()
  const now = new Date(minute * 60000)
  const weather = toWeatherNow(useEntity(config.sidebar.weather))
  const sun = useEntity(config.sidebar.sun)
  const outdoor = numericState(useEntity(config.sidebar.outdoorTemperature))
  const indoor = numericState(useEntity(config.sidebar.indoor[0]?.temperature))
  const summary = useEntity(config.home.summary)
  const text = summary && ![...UNKNOWN_STATES, ''].includes(summary.state) ? summary.state : undefined

  return (
    <Screensaver
      time={formatTime(now)}
      date={formatLongDate(now)}
      weatherIcon={weatherIcon(weather.condition, isNight(sun, now))}
      outdoor={`${decimal(outdoor)}°`}
      indoor={`${decimal(indoor)}°`}
      summary={text}
      hint={t('saver.hint')}
      minute={minute}
      onClose={useUi.getState().closeSaver}
    />
  )
}
