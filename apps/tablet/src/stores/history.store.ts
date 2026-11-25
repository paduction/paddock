import { create } from 'zustand'
import { HISTORY_RANGES, type HistoryRange } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'

type Series = Record<string, [number, number][]>

/** Temperature history per range, cached 5 minutes. */
export const useHistory = create<{ series: Partial<Record<HistoryRange, { at: number; data: Series }>> }>()(() => ({ series: {} }))

const sensors = () => [config.sidebar.indoor[0]?.temperature, config.sidebar.indoor[1]?.temperature, config.sidebar.pool].filter((x): x is string => !!x)

async function history(ids: string[], start: number): Promise<Series> {
  type Point = { s: string; lu?: number; lc?: number }
  const r = await ha.command<Record<string, Point[]>>({
    type: 'history/history_during_period',
    start_time: new Date(start).toISOString(),
    entity_ids: ids,
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false,
  })
  const out: Series = {}
  for (const id of ids) {
    out[id] = (r?.[id] ?? []).map((p) => [((p.lu ?? p.lc) || 0) * 1000, parseFloat(p.s)] as [number, number]).filter((p) => !Number.isNaN(p[1]))
  }
  return out
}

/** 24 h from the raw history; longer ranges from hourly statistics (history as a fallback). */
export async function loadHistory(range: HistoryRange, force = false) {
  const cached = useHistory.getState().series[range]
  if (!force && cached && Date.now() - cached.at < 5 * 60e3) return
  const ids = sensors()
  const start = Date.now() - HISTORY_RANGES[range].hours * 3600e3
  let data: Series = {}
  try {
    if (range === '24h') data = await history(ids, start)
    else {
      type Stat = { start: number | string; mean?: number | null }
      const r = await ha.command<Record<string, Stat[]>>({ type: 'recorder/statistics_during_period', start_time: new Date(start).toISOString(), statistic_ids: ids, period: 'hour', types: ['mean'] })
      for (const id of ids) data[id] = (r?.[id] ?? []).filter((p) => p.mean != null).map((p) => [typeof p.start === 'number' ? p.start : Date.parse(p.start), p.mean!] as [number, number])
      const missing = ids.filter((id) => !data[id].length)
      if (missing.length) Object.assign(data, await history(missing, start))
    }
  } catch (error) {
    console.warn('[paddock] temperature history', error)
  }
  useHistory.setState((s) => ({ series: { ...s.series, [range]: { at: Date.now(), data } } }))
}
