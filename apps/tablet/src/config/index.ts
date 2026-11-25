import { validateConfig, type ConfigProblem, type PaddockConfig } from '@paddock/core'
import { config as example } from './paddock.config.example'

/**
 * The home's settings. Nothing private ships in the build: at startup, once signed in,
 * the app asks Home Assistant for them (`paddock/config`, from paddock.yaml) and fills this object
 * before any screen is loaded. Until then — first setup, or the Paddock integration missing —
 * it holds the neutral example.
 */
export const config: PaddockConfig = structuredClone(example)

/** home-assistant: fetched now; cache: last settings fetched on this device (Home Assistant unreachable at startup). */
export let configSource: 'home-assistant' | 'cache' | 'example' = 'example'

/** What is wrong in paddock.yaml when Home Assistant's settings were refused (the screens then keep the last good settings, or the example). */
export let configProblems: ConfigProblem[] = []

const CACHE_KEY = 'paddock.config'

/**
 * Settings just read from Home Assistant: applied when the screens can work with them.
 * Otherwise they are refused and the problems are kept for the setup screen. Warnings (unknown setting, odd entity id) only go to the console.
 */
export function receiveConfig(loaded: PaddockConfig): boolean {
  const problems = validateConfig(loaded)
  for (const p of problems) if (p.level === 'warning') console.warn('[paddock] paddock.yaml', p.path, p.kind, p.expected ?? '')
  configProblems = problems.filter((p) => p.level === 'error')
  if (configProblems.length) return false
  applyConfig(loaded)
  return true
}

export function applyConfig(loaded: PaddockConfig, source: 'home-assistant' | 'cache' = 'home-assistant') {
  for (const key of Object.keys(config)) delete (config as unknown as Record<string, unknown>)[key]
  Object.assign(config, loaded)
  configSource = source
  if (source === 'home-assistant') saveCachedConfig(loaded)
}

/** Kept on the tablet only, so a power cut that restarts the tablet before Home Assistant still shows the home. */
export function cachedConfig(): PaddockConfig | null {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
  } catch {
    return null
  }
}

function saveCachedConfig(loaded: PaddockConfig) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(loaded))
  } catch {
    /* storage blocked: fetched again next time */
  }
}
