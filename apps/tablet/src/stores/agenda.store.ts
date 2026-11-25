import { create } from 'zustand'
import type { RawEvent } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'

const REFRESH = 5 * 60e3
const DAY = 864e5

/** Raw events of the next 15 days from every configured calendar. */
export const useAgenda = create<{ events: RawEvent[] }>()(() => ({ events: [] }))

async function load() {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from.getTime() + 15 * DAY)
  const events: RawEvent[] = []
  for (const calendar of config.calendars) {
    try {
      const r = await ha.command<{ response: Record<string, { events: Omit<RawEvent, 'calendar'>[] }> }>({
        type: 'call_service',
        domain: 'calendar',
        service: 'get_events',
        target: { entity_id: calendar.entity },
        service_data: { start_date_time: from.toISOString(), end_date_time: to.toISOString() },
        return_response: true,
      })
      for (const e of r?.response?.[calendar.entity]?.events ?? []) events.push({ ...e, calendar })
    } catch (error) {
      console.warn('[paddock] agenda', calendar.entity, error)
    }
  }
  useAgenda.setState({ events })
}

let started = false
ha.onStatus((status) => {
  if (status !== 'live' || started) return
  started = true
  load()
  setInterval(load, REFRESH)
})
