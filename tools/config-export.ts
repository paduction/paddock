/**
 * Writes paddock.yaml (repo root, git-ignored) from apps/tablet/src/config/paddock.config.local.ts
 * — or from the example with `--example` (writes paddock.example.yaml).
 * Secrets (the RAWG key) become `!secret` references: their values go to Home Assistant's secrets.yaml,
 * never into paddock.yaml.
 *
 *   pnpm config:export            → paddock.yaml (+ paddock.secrets.local.yaml with the values to add to secrets.yaml)
 *   pnpm config:export --example  → paddock.example.yaml
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import YAML from 'yaml'
import { writeYaml } from './lib/ha'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const example = process.argv.includes('--example')
const source = example ? 'paddock.config.example.ts' : 'paddock.config.local.ts'
const { config } = await import(join(root, 'apps/tablet/src/config', source))

/** config path → name in secrets.yaml */
const SECRETS: Record<string, string> = { 'gaming.rawgKey': 'paddock_rawg_key' }

const secretValues: Record<string, string> = {}
const data = structuredClone(config)
for (const [path, name] of Object.entries(SECRETS)) {
  const keys = path.split('.')
  const parent = keys.slice(0, -1).reduce((o: any, k) => o?.[k], data)
  const last = keys.at(-1)!
  if (parent && typeof parent[last] === 'string' && parent[last]) {
    secretValues[name] = parent[last]
    parent[last] = `__SECRET__${name}`
  }
}

const header = example
  ? '# Paddock — example settings. Copy to paddock.yaml next to configuration.yaml and put your own entity ids.\n'
  : '# Paddock — settings of this home. Read by the Paddock integration, served only to signed-in devices.\n'
const text = header + writeYaml(data).replace(/["']?__SECRET__([\w]+)["']?/g, '!secret $1')
writeFileSync(join(root, example ? 'paddock.example.yaml' : 'paddock.yaml'), text)
if (!example && Object.keys(secretValues).length) {
  writeFileSync(join(root, 'paddock.secrets.local.yaml'), YAML.stringify(secretValues), { mode: 0o600 })
}
console.log(`written ${example ? 'paddock.example.yaml' : 'paddock.yaml'}; secrets: ${Object.keys(secretValues).join(', ') || 'none'}`)
