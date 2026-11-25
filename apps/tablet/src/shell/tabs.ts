import { config } from '../config'
import type { MessageKey } from '../i18n/fr'
import type { ViewId } from '../stores/ui.store'

/** Navigation tabs; a tab whose feature is not configured is hidden. */
const ALL: { id: ViewId; label: MessageKey; icon: string }[] = [
  { id: 'home', label: 'tab.home', icon: 'home' },
  { id: 'lights', label: 'tab.lights', icon: 'lightbulb' },
  { id: 'covers', label: 'tab.covers', icon: 'blinds' },
  { id: 'cinema', label: 'tab.cinema', icon: 'movie' },
  { id: 'gaming', label: 'tab.gaming', icon: 'sports_esports' },
  { id: 'music', label: 'tab.music', icon: 'music_note' },
  { id: 'energy', label: 'tab.energy', icon: 'bolt' },
  { id: 'outdoor', label: 'tab.outdoor', icon: 'park' },
  { id: 'cleaning', label: 'tab.cleaning', icon: 'cleaning_services' },
  { id: 'cameras', label: 'tab.cameras', icon: 'videocam' },
  { id: 'automations', label: 'tab.automations', icon: 'routine' },
]

const ENABLED: Partial<Record<ViewId, boolean>> = {
  cinema: !!config.home.cinema || !!config.movies,
  gaming: !!config.gaming,
  music: !!config.music,
  energy: !!config.energy,
  outdoor: !!config.outdoor,
  cleaning: !!config.cleaning?.robots.length,
  cameras: !!config.cameras?.list.length,
}

export const TABS = ALL.filter((tab) => ENABLED[tab.id] ?? true)
