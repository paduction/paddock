/**
 * Checks paddock.yaml before it goes to Home Assistant.
 *
 *   pnpm config:check              → paddock.yaml at the repository root
 *   pnpm config:check my.yaml      → another file
 *   pnpm config:check --example    → the example shipped with Paddock
 *
 * Always: required fields, kinds of values, typos in setting names.
 * With HA_URL and HA_TOKEN set (see tools/deploy.example.env): also that every entity exists in Home Assistant.
 * Exit code 1 when something must be fixed.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { configEntities, describeProblem, validateConfig } from '../packages/core/src/config/validate'
import { connect, readYaml, root } from './lib/ha'

const args = process.argv.slice(2)
const offline = args.includes('--offline')
const file = args.find((a) => !a.startsWith('--'))

let config: unknown
let label: string
if (args.includes('--example')) {
  config = (await import(join(root, 'apps/tablet/src/config/paddock.config.example.ts'))).config
  label = 'the example configuration'
} else {
  const path = file ?? join(root, 'paddock.yaml')
  if (!existsSync(path)) {
    console.error(`${path} does not exist. Start from paddock.example.yaml, or run: pnpm discover --draft`)
    process.exit(1)
  }
  config = readYaml(path)
  label = path
}

const problems = validateConfig(config)
const errors = problems.filter((p) => p.level === 'error')
const warnings = problems.filter((p) => p.level === 'warning')
for (const p of errors) console.log(`  error    ${describeProblem(p)}`)
for (const p of warnings) console.log(`  warning  ${describeProblem(p)}`)

let missing = 0
const ha = offline ? null : connect()
if (ha) {
  try {
    const states = await ha.get<{ entity_id: string; state: string }[]>('/api/states')
    const known = new Map(states.map((s) => [s.entity_id, s.state]))
    for (const { path, entity } of configEntities(config)) {
      if (!known.has(entity)) {
        missing++
        console.log(`  missing  ${path}: ${entity} does not exist in Home Assistant`)
      } else if (known.get(entity) === 'unavailable') {
        console.log(`  offline  ${path}: ${entity} is unavailable right now`)
      }
    }
  } catch (error) {
    console.log(`  (entities not checked: ${(error as Error).message})`)
  }
} else if (!offline) {
  console.log('  (entities not checked against Home Assistant: HA_URL / HA_TOKEN not set)')
}

const total = configEntities(config).length
console.log(`${label}: ${errors.length} error(s), ${warnings.length} warning(s), ${missing} missing entit${missing === 1 ? 'y' : 'ies'} out of ${total}`)
process.exit(errors.length || missing ? 1 : 0)
