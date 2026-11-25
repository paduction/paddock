import { create } from 'zustand'
import { energyDay, type EnergyDay, type StatPoint } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'

/** Today's energy, from Home Assistant statistics (5-minute changes summed per half hour). */
export const useEnergy = create<{ day: EnergyDay | null; loadedAt: number }>()(() => ({ day: null, loadedAt: 0 }))

async function load() {
  const cfg = config.energy
  if (!cfg) return
  const ids = [cfg.solar, cfg.grid, cfg.green, cfg.discharge, cfg.charge].filter((x): x is string => !!x)
  if (!ids.length) return
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  try {
    const stats = await ha.command<Record<string, StatPoint[]>>({
      type: 'recorder/statistics_during_period',
      start_time: dayStart.toISOString(),
      statistic_ids: ids,
      period: '5minute',
      types: ['change'],
      units: { energy: 'kWh' },
    })
    useEnergy.setState({ day: energyDay(stats ?? {}, cfg, dayStart), loadedAt: Date.now() })
  } catch (error) {
    console.warn('[paddock] energy statistics', error)
  }
}

let started = false
ha.onStatus((status) => {
  if (status !== 'live' || started || !config.energy) return
  started = true
  load()
  setInterval(load, 5 * 60e3)
})

/** When the Energy tab opens: refresh if older than 2 minutes. */
export function refreshEnergy() {
  if (Date.now() - useEnergy.getState().loadedAt > 120e3) load()
}
