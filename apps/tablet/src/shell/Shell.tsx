import type { ComponentType } from 'react'
import { Stage } from '@paddock/ui'
import { CinemaPage } from '../pages/CinemaPage'
import { AutomationsPage } from '../pages/AutomationsPage'
import { CamerasPage } from '../pages/CamerasPage'
import { CleaningPage } from '../pages/CleaningPage'
import { CoversPage } from '../pages/CoversPage'
import { EnergyPage } from '../pages/EnergyPage'
import { OutdoorPage } from '../pages/OutdoorPage'
import { HomePage } from '../pages/HomePage'
import { LightsPage } from '../pages/LightsPage'
import { GamingPage } from '../pages/GamingPage'
import { MusicPage } from '../pages/MusicPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { useUi, type ViewId } from '../stores/ui.store'
import { Sidebar } from './Sidebar'
import { TABS } from './tabs'
import { AutomationOverlays } from '../widgets/AutomationOverlays'
import { CameraOverlays } from '../widgets/CameraOverlays'
import { MovieOverlays } from '../widgets/MovieOverlays'
import { SidebarOverlays } from '../widgets/SidebarOverlays'
import { SaverWidget } from '../widgets/SaverWidget'
import { TopNav } from './TopNav'
import styles from './Shell.module.css'

const PAGES: Partial<Record<ViewId, ComponentType>> = {
  home: HomePage,
  lights: LightsPage,
  covers: CoversPage,
  cinema: CinemaPage,
  gaming: GamingPage,
  music: MusicPage,
  energy: EnergyPage,
  outdoor: OutdoorPage,
  cleaning: CleaningPage,
  cameras: CamerasPage,
  automations: AutomationsPage,
}

/** Sidebar + navigation + current page, on the scaled stage. */
export function Shell() {
  const view = useUi((s) => s.view)
  const theme = useUi((s) => s.theme)
  const night = useUi((s) => s.night)
  const touched = useUi((s) => s.touched)
  const saver = useUi((s) => s.saver)
  const tab = TABS.find((t) => t.id === view)

  const Page = PAGES[view]
  const page = Page ? <Page /> : <PlaceholderPage label={tab?.label ?? 'tab.home'} icon={tab?.icon ?? 'home'} />

  return (
    <Stage theme={night ? 'dark' : theme} dimmed={night} onActivity={touched}>
      <Sidebar />
      <TopNav />
      <main className={styles.content}>
        <div key={view} className={styles.page}>
          {page}
        </div>
      </main>
      {!saver && <SidebarOverlays />}
      {!saver && <CameraOverlays />}
      {!saver && <MovieOverlays />}
      {!saver && <AutomationOverlays />}
      {saver && <SaverWidget />}
    </Stage>
  )
}
