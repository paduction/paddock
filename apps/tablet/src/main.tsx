import '@paddock/ui/styles.css'
import { loadCredentials, type PaddockConfig } from '@paddock/core'
import { applyConfig, cachedConfig, receiveConfig } from './config'
import { ha } from './ha'

/**
 * Sign in first, then fetch the home's settings from Home Assistant, then load the screens:
 * they read the configuration when their modules are evaluated.
 */
async function boot() {
  const credentials = loadCredentials()
  const forced = ['#reglages', '#settings'].includes(location.hash)
  if (credentials.url && credentials.token && !forced) {
    try {
      await ha.connect(credentials)
      // paddock.yaml with a mistake the screens cannot live with: same fallback as when it cannot be read
      if (!receiveConfig(await ha.command<PaddockConfig>({ type: 'paddock/config' }))) throw new Error('invalid paddock.yaml')
    } catch (error) {
      // Home Assistant unreachable or restarting: last settings seen on this device.
      // Otherwise not signed in (setup screen), or the Paddock integration / paddock.yaml is missing (warning in the setup screen).
      console.warn('[paddock] configuration', error)
      const cached = cachedConfig()
      if (cached) applyConfig(cached, 'cache')
    }
  }
  const { start } = await import('./start')
  start()
}

boot()
