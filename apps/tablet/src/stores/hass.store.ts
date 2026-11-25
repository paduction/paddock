import { create } from 'zustand'
import type { ConnectionStatus, HassEntities, HassEntity } from '@paddock/core'
import { ha } from '../ha'

interface HassState {
  status: ConnectionStatus
  entities: HassEntities
}

/** Mirror of Home Assistant: connection status + all entities. Read-only for the UI. */
export const useHass = create<HassState>()(() => ({ status: 'connecting', entities: {} }))

ha.onStatus((status) => useHass.setState({ status }))
ha.onEntities((entities) => useHass.setState({ entities }))

/** One entity. Components re-render only when THIS entity changes. */
export function useEntity(id: string | undefined): HassEntity | undefined {
  return useHass((s) => (id ? s.entities[id] : undefined))
}
