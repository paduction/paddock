/**
 * Shared by the command-line tools: where the repository is, how to read paddock.yaml,
 * and how to ask Home Assistant something (REST API) with the address and token of tools/deploy.local.env.
 * The token is only ever sent to Home Assistant; it is never printed.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

export const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** HA_URL / HA_TOKEN (and the deploy settings) from the environment, else from tools/deploy.local.env. */
export function settings(): Record<string, string> {
  const file = join(root, 'tools/deploy.local.env')
  const fromFile: Record<string, string> = {}
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = /^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line)
      if (match) fromFile[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
  const out = { ...fromFile }
  for (const key of ['HA_URL', 'HA_TOKEN']) if (process.env[key]) out[key] = process.env[key]!
  return out
}

export interface Ha {
  get<T>(path: string): Promise<T>
  /** Renders a template in Home Assistant and returns its text. */
  template(template: string): Promise<string>
}

/** null when the address or the token is not set. */
export function connect(): Ha | null {
  const { HA_URL, HA_TOKEN } = settings()
  if (!HA_URL || !HA_TOKEN) return null
  const base = HA_URL.replace(/\/$/, '')
  const call = async (path: string, init: RequestInit = {}) => {
    let response: Response
    try {
      response = await fetch(base + path, { ...init, headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) })
    } catch {
      throw new Error(`Home Assistant does not answer at ${base}`)
    }
    if (response.status === 401) throw new Error('Home Assistant refused the token (HA_TOKEN)')
    if (!response.ok) throw new Error(`Home Assistant answered ${response.status} for ${path}`)
    return response
  }
  return {
    get: async (path) => (await call(path)).json(),
    template: async (template) => (await call('/api/template', { method: 'POST', body: JSON.stringify({ template }) })).text(),
  }
}

export const NO_HA = 'Set HA_URL and HA_TOKEN (environment, or tools/deploy.local.env — see tools/deploy.example.env).'

/**
 * Home Assistant reads YAML 1.1: a bare `on`, `off`, `yes` or `no` is a boolean, as a key and as a value.
 * The tools read and write paddock.yaml the same way, so what they accept is what Home Assistant will see.
 */
export const YAML_VERSION = '1.1' as const

/** The integration gives the keys `on` and `off` their names back (see _named_keys); so do the tools. */
function namedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(namedKeys)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key === 'true' ? 'on' : key === 'false' ? 'off' : key, namedKeys(item)]))
}

/** paddock.yaml as Home Assistant will read it; `!secret name` stays a placeholder string (the value lives in Home Assistant). */
export function readYaml(path: string): unknown {
  const secret = { tag: '!secret', resolve: (name: string) => `!secret ${name}` }
  return namedKeys(YAML.parse(readFileSync(path, 'utf8'), { customTags: [secret], version: YAML_VERSION }))
}

/** Text for paddock.yaml: words that YAML 1.1 would read as booleans are quoted. */
export function writeYaml(data: unknown): string {
  return YAML.stringify(data, { lineWidth: 0, version: YAML_VERSION })
}
