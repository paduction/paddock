import { create } from 'zustand'
import { loadCredentials, saveCredentials, validateConfig, type Credentials, type PaddockConfig } from '@paddock/core'
import { cachedConfig, configProblems, configSource } from '../config'
import { ha } from '../ha'
import { t } from '../i18n'

interface ConnectionState {
  setupOpen: boolean
  message: string
  connect: (credentials: Credentials) => Promise<void>
}

/** First connection, and the setup screen when the token is missing or refused. */
export const useConnection = create<ConnectionState>()((set) => ({
  setupOpen: false,
  message: '',
  connect: async (credentials) => {
    set({ setupOpen: false, message: '' })
    saveCredentials(credentials)
    try {
      await ha.connect(credentials)
      // signed in from the setup screen, or after starting from the cached settings: start again
      // when Home Assistant has (new) settings, so they are fetched before the screens load
      if (configSource !== 'home-assistant') await reloadIfNewConfig()
    } catch (error) {
      const invalid = (error as Error).message === 'invalid-auth'
      // started from the cached settings while Home Assistant is down (power cut): keep the screens and retry
      if (!invalid && configSource === 'cache') {
        setTimeout(() => useConnection.getState().connect(credentials), 15000)
        return
      }
      set({ setupOpen: true, message: t(invalid ? 'setup.invalidAuth' : 'setup.unreachable') })
    }
  },
}))

/** Signed in but without usable settings: say why on the setup screen (paddock.yaml missing, or what is wrong in it). */
function noConfig() {
  if (configSource !== 'example') return
  const lines = configProblems.slice(0, 6).map((p) => '· ' + t(`config.${p.kind}`, { path: p.path, expected: p.expected ?? '' }))
  const more = configProblems.length > 6 ? ['· …'] : []
  const message = configProblems.length ? [t('setup.invalidConfig'), ...lines, ...more].join('\n') : t('setup.noConfig')
  useConnection.setState({ setupOpen: true, message })
}

async function reloadIfNewConfig() {
  try {
    const fresh = await ha.command<PaddockConfig>({ type: 'paddock/config' })
    // refused settings are not worth a reload: the screens keep what they have until paddock.yaml is fixed
    if (validateConfig(fresh).some((p) => p.level === 'error')) return noConfig()
    if (configSource === 'example' || JSON.stringify(fresh) !== JSON.stringify(cachedConfig())) location.reload()
  } catch {
    noConfig()
  }
}

/** Called once at startup. `#reglages` / `#settings` forces the setup screen. */
export function startConnection() {
  const credentials = loadCredentials()
  const forced = ['#reglages', '#settings'].includes(location.hash)
  if (forced) history.replaceState(null, '', location.pathname + location.search)
  if (!credentials.url || !credentials.token || forced) {
    useConnection.setState({ setupOpen: true })
    return
  }
  // already signed in by main.tsx, but Home Assistant had no settings for Paddock
  if (ha.status === 'live') {
    noConfig()
    return
  }
  useConnection.getState().connect(credentials)
}
