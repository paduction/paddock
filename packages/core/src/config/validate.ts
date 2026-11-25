/**
 * Checks a configuration read from paddock.yaml before the screens use it:
 * a missing or mistyped field is reported with its path instead of breaking a screen.
 *
 * `SHAPE` mirrors the interfaces of schema.ts: when a field is added there, add it here
 * (validate.test.ts fails when the example configuration and the shape disagree).
 */

export interface ConfigProblem {
  /** Where, e.g. `lighting.lights[2].entity` */
  path: string
  /**
   * missing: required field absent · type: wrong kind of value · choice: not one of the allowed values
   * entity: not a Home Assistant entity id (or not the expected domain) · unknown: field Paddock does not know (typo?)
   * reference: points to an id that does not exist in the configuration
   */
  kind: 'missing' | 'type' | 'choice' | 'entity' | 'unknown' | 'reference'
  /** What was expected, e.g. `number`, `light.…`, `fr | en` */
  expected?: string
  /** error: the screens cannot work with it · warning: Paddock starts, something will not work */
  level: 'error' | 'warning'
}

/** An entity id used by the configuration, with where it is used. */
export interface ConfigEntity {
  path: string
  entity: string
}

type Rule =
  | { kind: 'string' | 'number' | 'boolean' }
  | { kind: 'entity'; domains: string[] }
  | { kind: 'choice'; values: string[] }
  | { kind: 'list'; of: Rule }
  | { kind: 'map'; of: Rule }
  | { kind: 'object'; shape: Shape }
  | { kind: 'optional'; rule: Rule }
type Shape = Record<string, Rule>

const str: Rule = { kind: 'string' }
const num: Rule = { kind: 'number' }
const bool: Rule = { kind: 'boolean' }
/** Entity id; with domains, the id must start with one of them. */
const ent = (...domains: string[]): Rule => ({ kind: 'entity', domains })
const choice = (...values: string[]): Rule => ({ kind: 'choice', values })
const list = (of: Rule): Rule => ({ kind: 'list', of })
const map = (of: Rule): Rule => ({ kind: 'map', of })
const obj = (shape: Shape): Rule => ({ kind: 'object', shape })
const opt = (rule: Rule): Rule => ({ kind: 'optional', rule })

const device = obj({ entity: ent(), name: str, icon: str, on: str, off: str })
const labelled = list(obj({ id: str, label: str, icon: opt(str) }))

const SHAPE: Shape = {
  locale: choice('fr', 'en'),
  idleMinutes: num,
  home: obj({
    summary: opt(ent()),
    climate: opt(obj({ entity: ent('climate'), name: str, temperatureSensor: opt(ent('sensor')) })),
    gate: opt(obj({ entity: ent('cover'), name: str, alertAfterMinutes: num })),
    cinema: opt(
      obj({
        toggle: ent('input_boolean'),
        dimLights: list(str),
        screen: obj({ down: ent('script'), up: ent('script') }),
        projector: obj({ on: ent('script'), off: ent('script') }),
        amplifier: ent(),
        light: opt(str),
        player: opt(obj({ name: str, media: ent('media_player'), remote: ent('remote') })),
      }),
    ),
    alerts: obj({
      batteries: list(ent('sensor')),
      batteryLow: num,
      vigilance: opt(ent('sensor')),
      nextRain: opt(ent('sensor')),
      people: opt(list(obj({ name: str, sensor: ent('binary_sensor') }))),
    }),
  }),
  covers: list(obj({ id: str, entity: ent('cover'), name: str, group: str })),
  movies: opt(
    obj({
      server: str,
      playScript: ent('script'),
      tvs: list(obj({ media: ent('media_player'), remote: ent('remote'), name: str, plexKeyword: str, where: str, remoteTitle: str })),
    }),
  ),
  gaming: opt(
    obj({
      name: str,
      console: ent('media_player'),
      account: opt(
        obj({
          status: opt(ent('sensor')),
          lastOnline: opt(ent('sensor')),
          nowPlaying: opt(ent('sensor')),
          trophyLevel: opt(ent('sensor')),
          onlineId: opt(ent('sensor')),
          avatar: opt(ent('image')),
          plus: opt(ent('binary_sensor')),
          nextLevel: opt(ent('sensor')),
          platinum: opt(ent('sensor')),
          gold: opt(ent('sensor')),
          silver: opt(ent('sensor')),
          bronze: opt(ent('sensor')),
        }),
      ),
      power: opt(ent('switch')),
      rawgKey: opt(str),
      trailerSound: opt(obj({ player: ent('media_player'), volume: opt(num), restore: opt(num) })),
      wikipedia: opt(str),
    }),
  ),
  music: opt(
    obj({
      player: ent('media_player'),
      speakers: list(obj({ entity: ent('media_player'), name: str, members: opt(list(ent('media_player'))) })),
      playlist: opt(str),
    }),
  ),
  energy: opt(
    obj({
      autonomy: opt(ent('sensor')),
      selfConsumption: opt(ent('sensor')),
      battery: opt(ent('sensor')),
      batteryCapacityKwh: opt(num),
      batteryNote: opt(str),
      solar: opt(ent('sensor')),
      grid: opt(ent('sensor')),
      green: opt(ent('sensor')),
      discharge: opt(ent('sensor')),
      charge: opt(ent('sensor')),
    }),
  ),
  outdoor: opt(obj({ pool: opt(ent('sensor')), poolDevice: opt(device), devices: list(device) })),
  cleaning: opt(
    obj({
      robots: list(
        obj({
          entity: ent('vacuum'),
          name: str,
          model: str,
          battery: opt(ent('sensor')),
          mode: opt(ent('select')),
          modes: opt(
            obj({
              kinds: labelled,
              levels: labelled,
              options: map(map(str)),
              default: opt(obj({ kind: str, level: str })),
            }),
          ),
          modeLabels: opt(map(str)),
          error: opt(ent('sensor')),
          rooms: opt(list(obj({ area: str, name: str }))),
          zones: opt(list(obj({ id: str, name: str, icon: str, rooms: list(str) }))),
        }),
      ),
    }),
  ),
  cameras: opt(
    obj({
      list: list(obj({ entity: ent('camera'), name: str, person: opt(ent('binary_sensor')), live: opt(bool) })),
      doorbell: opt(obj({ event: ent('event'), camera: ent('camera') })),
      security: opt(list(ent('select'))),
      eventsRoot: opt(str),
    }),
  ),
  lighting: obj({
    rows: list(obj({ type: choice('room', 'scenes'), room: opt(str) })),
    lights: list(obj({ id: str, entity: ent('light'), name: str, room: str, icon: str, presence: opt(ent('binary_sensor')) })),
    scenes: list(obj({ id: str, entity: ent('scene'), name: str, icon: str })),
  }),
  people: list(obj({ name: str, entity: ent('person') })),
  calendars: list(obj({ entity: ent('calendar'), name: str, source: opt(str), people: opt(str) })),
  sidebar: obj({
    weather: opt(ent('weather')),
    sun: opt(ent('sun')),
    outdoorTemperature: opt(ent('sensor')),
    outdoorHumidity: opt(ent('sensor')),
    indoor: list(obj({ label: str, icon: str, tone: choice('accent', 'blue'), temperature: ent('sensor'), humidity: opt(ent('sensor')) })),
    pool: opt(ent('sensor')),
  }),
}

const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

interface Walk {
  problems: ConfigProblem[]
  entities: ConfigEntity[]
}

function check(rule: Rule, value: unknown, path: string, out: Walk): void {
  const wrong = (expected: string, kind: ConfigProblem['kind'] = 'type', level: ConfigProblem['level'] = 'error') =>
    void out.problems.push({ path, kind, expected, level })

  switch (rule.kind) {
    case 'optional':
      if (value !== undefined && value !== null) check(rule.rule, value, path, out)
      return
    case 'string':
    case 'number':
    case 'boolean':
      if (typeof value !== rule.kind) wrong(rule.kind)
      return
    case 'choice':
      if (typeof value !== 'string' || !rule.values.includes(value)) wrong(rule.values.join(' | '), 'choice')
      return
    case 'entity': {
      if (typeof value !== 'string') return wrong('entity id')
      const expected = rule.domains.length ? rule.domains.map((d) => `${d}.…`).join(' | ') : 'domain.name'
      const domainOk = !rule.domains.length || rule.domains.includes(value.split('.')[0])
      // a wrong id does not break a screen: the tile just stays empty
      if (!ENTITY_ID.test(value) || !domainOk) wrong(expected, 'entity', 'warning')
      else out.entities.push({ path, entity: value })
      return
    }
    case 'list':
      if (!Array.isArray(value)) return wrong('list')
      value.forEach((item, index) => check(rule.of, item, `${path}[${index}]`, out))
      return
    case 'map':
      if (!isRecord(value)) return wrong('mapping')
      for (const [key, item] of Object.entries(value)) check(rule.of, item, `${path}.${key}`, out)
      return
    case 'object': {
      if (!isRecord(value)) return wrong('mapping')
      const at = (key: string) => (path ? `${path}.${key}` : key)
      for (const [key, sub] of Object.entries(rule.shape)) {
        const item = value[key]
        if ((item === undefined || item === null) && sub.kind !== 'optional') out.problems.push({ path: at(key), kind: 'missing', level: 'error' })
        else check(sub, item, at(key), out)
      }
      for (const key of Object.keys(value)) {
        if (!(key in rule.shape)) out.problems.push({ path: at(key), kind: 'unknown', level: 'warning' })
      }
      return
    }
  }
}

/** Ids that must exist elsewhere in the configuration. */
function references(config: Record<string, unknown>, problems: ConfigProblem[]) {
  const lighting = isRecord(config.lighting) ? config.lighting : {}
  const lights = Array.isArray(lighting.lights) ? lighting.lights.filter(isRecord) : []
  const ids = new Set(lights.map((l) => l.id))
  const rooms = new Set(lights.map((l) => l.room))
  const missing = (path: string, expected: string) => problems.push({ path, kind: 'reference', expected, level: 'warning' })

  const cinema = isRecord(config.home) && isRecord(config.home.cinema) ? config.home.cinema : null
  if (cinema) {
    if (Array.isArray(cinema.dimLights)) cinema.dimLights.forEach((id, i) => ids.has(id) || missing(`home.cinema.dimLights[${i}]`, 'id of lighting.lights'))
    if (typeof cinema.light === 'string' && !ids.has(cinema.light)) missing('home.cinema.light', 'id of lighting.lights')
  }
  if (Array.isArray(lighting.rows)) {
    lighting.rows.forEach((row, i) => {
      if (isRecord(row) && row.type === 'room' && !rooms.has(row.room)) missing(`lighting.rows[${i}].room`, 'room of lighting.lights')
    })
  }
}

function walk(config: unknown): Walk {
  const out: Walk = { problems: [], entities: [] }
  check(obj(SHAPE), config, '', out)
  if (isRecord(config)) references(config, out.problems)
  return out
}

/** Problems of a configuration, errors first. An empty list means it is valid. */
export function validateConfig(config: unknown): ConfigProblem[] {
  return walk(config).problems.sort((a, b) => Number(a.level === 'warning') - Number(b.level === 'warning'))
}

/** Every entity id the configuration refers to (to check them against Home Assistant). */
export function configEntities(config: unknown): ConfigEntity[] {
  return walk(config).entities
}

/** One line of plain English per problem (tools and logs; the app has its own translated texts). */
export function describeProblem(p: ConfigProblem): string {
  const what: Record<ConfigProblem['kind'], string> = {
    missing: 'is required',
    type: `must be a ${p.expected}`,
    choice: `must be one of: ${p.expected}`,
    entity: `is not an entity id like ${p.expected}`,
    unknown: 'is not a Paddock setting (typo?)',
    reference: `does not match any ${p.expected}`,
  }
  return `${p.path} ${what[p.kind]}`
}
