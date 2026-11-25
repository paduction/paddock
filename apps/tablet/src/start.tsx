import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { config } from './config'
import { isDesktop, startDesktop } from './desktop'
import { startConnection } from './stores/connection.store'
import { watchIdle } from './stores/ui.store'
// Data sources that start with the connection
import './stores/agenda.store'
import './stores/weather.store'
import './stores/energy.store'
import './stores/music.store'
import './stores/cameras.store'
import './stores/gaming.store'
import './stores/account.store'
import './stores/automations.store'

/** Loaded once the configuration is known (see main.tsx). */
export function start() {
  startConnection()
  startDesktop()
  // The screensaver protects a wall tablet that stays on; a computer has its own
  if (!isDesktop) watchIdle(config.idleMinutes)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
