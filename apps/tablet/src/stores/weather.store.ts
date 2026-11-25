import { create } from 'zustand'
import type { Forecast } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'

/** Daily (15 days) and hourly forecasts, kept up to date by Home Assistant. */
export const useForecast = create<{ days: number; daily: Forecast[]; hourly: Forecast[] }>()(() => ({ days: 0, daily: [], hourly: [] }))

let subscribed = false
ha.onStatus((status) => {
  const entity = config.sidebar.weather
  if (status !== 'live' || subscribed || !entity) return
  subscribed = true
  for (const type of ['daily', 'hourly'] as const) {
    ha.subscribe<{ forecast?: Forecast[] }>({ type: 'weather/subscribe_forecast', forecast_type: type, entity_id: entity }, (m) => {
      if (!Array.isArray(m?.forecast)) return
      if (type === 'daily') useForecast.setState({ daily: m.forecast, days: Math.min(15, m.forecast.length) })
      else useForecast.setState({ hourly: m.forecast })
    }).catch((error) => console.warn('[paddock] forecast', type, error))
  }
})
