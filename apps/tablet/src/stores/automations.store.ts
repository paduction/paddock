import { create } from 'zustand'
import { sortAutomations, type Automation } from '@paddock/core'
import { ha } from '../ha'

interface AutomationsState {
  items: Automation[]
  /** unsupported: the Paddock integration in Home Assistant is too old (or missing) */
  status: 'loading' | 'ready' | 'unsupported'
}

/** Automations kept by the Paddock integration; every screen of the home sees the same list, live. */
export const useAutomations = create<AutomationsState>()(() => ({ items: [], status: 'loading' }))

let subscribed = false
ha.onStatus(async (status) => {
  if (status !== 'live' || subscribed) return
  subscribed = true
  try {
    await ha.subscribe<{ items: Automation[] }>({ type: 'paddock/automations/subscribe' }, ({ items }) =>
      useAutomations.setState({ items: sortAutomations(items), status: 'ready' }),
    )
  } catch (error) {
    console.warn('[paddock] automations', error)
    subscribed = false
    useAutomations.setState({ status: 'unsupported' })
  }
})

/** Saves; resolves to null, or to the reason Home Assistant refused it (name, actions, device, time…). */
export async function saveAutomation(automation: Automation): Promise<string | null> {
  try {
    const { last_run: _lastRun, ...item } = automation
    await ha.command({ type: 'paddock/automations/save', item })
    return null
  } catch (error) {
    return (error as { message?: string }).message || 'unknown'
  }
}

export const deleteAutomation = (id: string) => ha.command({ type: 'paddock/automations/delete', automation: id }).catch((error) => console.warn('[paddock] automation delete', error))

/** Runs it now (a mode's button). Resolves to false when Home Assistant refused. */
export const runAutomation = (id: string) =>
  ha.command({ type: 'paddock/automations/run', automation: id }).then(
    () => true,
    () => false,
  )
