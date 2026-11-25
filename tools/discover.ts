/**
 * Lists what Home Assistant has that Paddock can show, so paddock.yaml can be written from real entity ids.
 *
 *   pnpm discover            → paddock.discovery.local.md  (readable) and .json (for tools and AI assistants)
 *   pnpm discover --draft    → also a first paddock.yaml built from what was found
 *                              (written to paddock.draft.local.yaml when paddock.yaml already exists)
 *
 * Read-only: it asks Home Assistant for its entities, areas and a few integrations. Nothing is changed there.
 * The result files are git-ignored: they describe your home.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PaddockConfig } from '../packages/core/src/config/schema'
import { describeProblem, validateConfig } from '../packages/core/src/config/validate'
import { connect, NO_HA, root, writeYaml } from './lib/ha'

interface Found {
  entity: string
  name: string
  area: string
  deviceClass: string
  unit: string
}

/** Integrations whose entities Paddock treats specially. */
const INTEGRATIONS = ['music_assistant', 'playstation_network', 'plex', 'apple_tv', 'fully_kiosk', 'meteo_france']

const ha = connect()
if (!ha) {
  console.error(NO_HA)
  process.exit(1)
}

// Areas and integrations come from one template, as plain lines (kind|name|entity,entity,…)
const TEMPLATE = `{% for a in areas() %}area|{{ area_name(a) }}|{{ area_entities(a) | join(',') }}
{% endfor %}{% for d in ${JSON.stringify(INTEGRATIONS)} %}integration|{{ d }}|{{ integration_entities(d) | join(',') }}
{% endfor %}`

let states: { entity_id: string; attributes: Record<string, unknown> }[]
let lines: string[]
let haConfig: { language?: string; location_name?: string }
try {
  states = await ha.get('/api/states')
  lines = (await ha.template(TEMPLATE)).split('\n')
  haConfig = await ha.get('/api/config')
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}

const areaOf = new Map<string, string>()
const byIntegration: Record<string, string[]> = {}
for (const line of lines) {
  const [kind, name, ids = ''] = line.trim().split('|')
  const entities = ids.split(',').filter(Boolean)
  if (kind === 'area') for (const id of entities) areaOf.set(id, name)
  if (kind === 'integration') byIntegration[name] = entities
}

const all: Found[] = states
  .map((s) => ({
    entity: s.entity_id,
    name: String(s.attributes.friendly_name ?? s.entity_id),
    area: areaOf.get(s.entity_id) ?? '',
    deviceClass: String(s.attributes.device_class ?? ''),
    unit: String(s.attributes.unit_of_measurement ?? ''),
  }))
  .sort((a, b) => a.area.localeCompare(b.area) || a.entity.localeCompare(b.entity))

const domain = (name: string) => all.filter((e) => e.entity.startsWith(`${name}.`))
const of = (integration: string, d?: string) => all.filter((e) => byIntegration[integration]?.includes(e.entity) && (!d || e.entity.startsWith(`${d}.`)))
const isGate = (e: Found) => ['garage', 'gate', 'door'].includes(e.deviceClass)

/** paddock.yaml setting → what was found for it */
const sections: { setting: string; note: string; found: Found[] }[] = [
  { setting: 'lighting.lights', note: 'One tile per light, grouped by room.', found: domain('light') },
  { setting: 'lighting.scenes', note: 'Scenes shown on the Lighting page.', found: domain('scene') },
  { setting: 'covers', note: 'Shutters and blinds.', found: domain('cover').filter((e) => !isGate(e)) },
  { setting: 'home.gate', note: 'Gate or garage door: big tile on the home page.', found: domain('cover').filter(isGate) },
  { setting: 'home.climate', note: 'Thermostat on the home page.', found: domain('climate') },
  { setting: 'people', note: 'Who is home.', found: domain('person') },
  { setting: 'calendars', note: 'Agenda in the sidebar.', found: domain('calendar') },
  { setting: 'sidebar.weather', note: 'Weather in the sidebar.', found: domain('weather') },
  { setting: 'sidebar.indoor / outdoorTemperature / pool', note: 'Temperature sensors.', found: domain('sensor').filter((e) => e.deviceClass === 'temperature') },
  { setting: 'sidebar.indoor[].humidity / outdoorHumidity', note: 'Humidity sensors.', found: domain('sensor').filter((e) => e.deviceClass === 'humidity') },
  { setting: 'home.alerts.batteries', note: 'Battery levels watched for the "low battery" alert.', found: domain('sensor').filter((e) => e.deviceClass === 'battery') },
  { setting: 'cameras.list', note: 'Cameras.', found: domain('camera') },
  { setting: 'cameras.list[].person', note: 'Person / occupancy / motion sensors (one per camera).', found: domain('binary_sensor').filter((e) => ['occupancy', 'motion'].includes(e.deviceClass) || /person/.test(e.entity)) },
  { setting: 'cameras.doorbell.event', note: 'Doorbell events.', found: domain('event').filter((e) => e.deviceClass === 'doorbell' || /doorbell|ring/.test(e.entity)) },
  { setting: 'cameras.security', note: 'Security mode selects (options Home / Away / Disarmed).', found: domain('select').filter((e) => /security|alarm/.test(e.entity)) },
  { setting: 'music.speakers', note: 'Music Assistant players (the Music page needs Music Assistant).', found: of('music_assistant', 'media_player') },
  { setting: 'gaming.console', note: 'PlayStation Network integration.', found: of('playstation_network') },
  { setting: 'home.cinema.player / movies.tvs', note: 'Apple TV players and remotes.', found: of('apple_tv') },
  { setting: 'gaming.trailerSound.player', note: 'Fully Kiosk tablet (media player).', found: of('fully_kiosk', 'media_player') },
  { setting: 'cleaning.robots', note: 'Robot vacuums.', found: domain('vacuum') },
  { setting: 'energy', note: 'Cumulative energy sensors (kWh).', found: domain('sensor').filter((e) => e.deviceClass === 'energy') },
  { setting: 'outdoor.devices / home.cinema.amplifier', note: 'Switches.', found: domain('switch') },
  { setting: 'home.cinema (toggle, screen, projector) / movies.playScript', note: 'Helpers and scripts.', found: [...domain('input_boolean'), ...domain('script')] },
  { setting: 'home.summary', note: 'Text helper holding a daily summary.', found: domain('input_text') },
  { setting: 'home.alerts.vigilance / nextRain', note: 'Météo-France sensors.', found: of('meteo_france', 'sensor') },
]

const table = (found: Found[]) =>
  found.length ? ['| Entity | Name | Area |', '|---|---|---|', ...found.map((e) => `| \`${e.entity}\` | ${e.name.replace(/\|/g, '/')} | ${e.area} |`)].join('\n') : '_Nothing found._'

const markdown = [
  `# What Paddock can use in ${haConfig.location_name ?? 'this home'}`,
  '',
  `${all.length} entities, ${new Set(areaOf.values()).size} areas. Generated by \`pnpm discover\`; this file is git-ignored.`,
  'Each section is a setting of paddock.yaml (see docs/en/configuration.md) with the entities that fit it.',
  '',
  ...sections.flatMap((s) => [`## ${s.setting}`, '', s.note, '', table(s.found), '']),
].join('\n')

writeFileSync(join(root, 'paddock.discovery.local.md'), markdown)
writeFileSync(join(root, 'paddock.discovery.local.json'), JSON.stringify({ home: haConfig.location_name, language: haConfig.language, sections }, null, 2))
console.log(`${all.length} entities read from Home Assistant.`)
for (const s of sections) if (s.found.length) console.log(`  ${String(s.found.length).padStart(4)}  ${s.setting}`)
console.log('→ paddock.discovery.local.md and paddock.discovery.local.json')

if (process.argv.includes('--draft')) {
  const slug = (e: Found) => e.entity.split('.')[1]
  const room = (e: Found) => e.area || 'Home'
  const lights = domain('light')
  const temperatures = domain('sensor').filter((e) => e.deviceClass === 'temperature' && e.area)
  const humidityIn = (area: string) => domain('sensor').find((e) => e.deviceClass === 'humidity' && e.area === area)?.entity
  const gate = domain('cover').find(isGate)
  const climate = domain('climate')[0]
  const cameras = domain('camera')
  const speakers = of('music_assistant', 'media_player')
  const vacuums = domain('vacuum')

  const draft: PaddockConfig = {
    locale: haConfig.language === 'fr' ? 'fr' : 'en',
    idleMinutes: 2,
    home: {
      ...(climate ? { climate: { entity: climate.entity, name: climate.name } } : {}),
      ...(gate ? { gate: { entity: gate.entity, name: gate.name, alertAfterMinutes: 10 } } : {}),
      alerts: { batteries: domain('sensor').filter((e) => e.deviceClass === 'battery' && e.unit === '%').map((e) => e.entity), batteryLow: 15 },
    },
    covers: domain('cover').filter((e) => !isGate(e)).map((e) => ({ id: slug(e), entity: e.entity, name: e.name, group: room(e) })),
    lighting: {
      rows: [...[...new Set(lights.map(room))].map((r) => ({ type: 'room' as const, room: r })), { type: 'scenes' as const }],
      lights: lights.map((e) => ({ id: slug(e), entity: e.entity, name: e.name, room: room(e), icon: 'lightbulb' })),
      scenes: domain('scene').map((e) => ({ id: slug(e), entity: e.entity, name: e.name, icon: 'wb_twilight' })),
    },
    people: domain('person').map((e) => ({ name: e.name, entity: e.entity })),
    calendars: domain('calendar').map((e) => ({ entity: e.entity, name: e.name })),
    sidebar: {
      ...(domain('weather')[0] ? { weather: domain('weather')[0].entity } : {}),
      ...(domain('sun')[0] ? { sun: domain('sun')[0].entity } : {}),
      indoor: temperatures.slice(0, 2).map((e, i) => ({
        label: e.area,
        icon: i ? 'desk' : 'home',
        tone: i ? ('blue' as const) : ('accent' as const),
        temperature: e.entity,
        ...(humidityIn(e.area) ? { humidity: humidityIn(e.area) } : {}),
      })),
    },
    ...(cameras.length ? { cameras: { list: cameras.map((e) => ({ entity: e.entity, name: e.name })) } } : {}),
    ...(speakers.length ? { music: { player: speakers[0].entity, speakers: speakers.map((e) => ({ entity: e.entity, name: e.name })) } } : {}),
    ...(vacuums.length ? { cleaning: { robots: vacuums.map((e) => ({ entity: e.entity, name: e.area || e.name, model: e.name })) } } : {}),
  }

  const errors = validateConfig(draft).filter((p) => p.level === 'error')
  if (errors.length) {
    console.error('The draft is not valid (please report this):\n' + errors.map(describeProblem).join('\n'))
    process.exit(1)
  }
  const target = existsSync(join(root, 'paddock.yaml')) ? 'paddock.draft.local.yaml' : 'paddock.yaml'
  const header =
    '# Paddock — first draft written by `pnpm discover --draft` from what Home Assistant has.\n' +
    '# Remove what you do not want on the wall, rename, pick icons (https://fonts.google.com/icons), then: pnpm config:check\n' +
    '# Cinema, films, games, energy and outdoor are not guessed: copy those parts from paddock.example.yaml.\n'
  writeFileSync(join(root, target), header + writeYaml(draft))
  console.log(`→ ${target} (a starting point: edit it, then run pnpm config:check)`)
}
