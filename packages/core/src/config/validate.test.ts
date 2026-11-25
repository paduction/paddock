import { describe, expect, it } from 'vitest'
import { configEntities, describeProblem, validateConfig } from './validate'

const minimal = () => ({
  locale: 'en',
  idleMinutes: 2,
  home: { alerts: { batteries: [], batteryLow: 10 } },
  covers: [{ id: 'living', entity: 'cover.living_room', name: 'Window', group: 'Living room' }],
  lighting: {
    rows: [{ type: 'room', room: 'Living room' }, { type: 'scenes' }],
    lights: [{ id: 'living', entity: 'light.living_room', name: 'Ceiling', room: 'Living room', icon: 'light' }],
    scenes: [],
  },
  people: [{ name: 'Alex', entity: 'person.alex' }],
  calendars: [],
  sidebar: { indoor: [] },
})

describe('validateConfig', () => {
  it('accepts a minimal configuration', () => {
    expect(validateConfig(minimal())).toEqual([])
  })

  it('reports a missing required field with its path', () => {
    const config = minimal() as Record<string, unknown>
    delete config.covers
    expect(validateConfig(config)).toEqual([{ path: 'covers', kind: 'missing', level: 'error' }])
  })

  it('reports a wrong type inside a list', () => {
    const config = minimal()
    ;(config.lighting.lights[0] as Record<string, unknown>).name = 12
    expect(validateConfig(config)).toEqual([{ path: 'lighting.lights[0].name', kind: 'type', expected: 'string', level: 'error' }])
  })

  it('warns about an entity of the wrong domain, without blocking', () => {
    const config = minimal()
    config.covers[0].entity = 'switch.living_room'
    expect(validateConfig(config)).toEqual([{ path: 'covers[0].entity', kind: 'entity', expected: 'cover.…', level: 'warning' }])
  })

  it('warns about a setting it does not know (typo in an optional module)', () => {
    const problems = validateConfig({ ...minimal(), gamming: { name: 'PS5' } })
    expect(problems).toEqual([{ path: 'gamming', kind: 'unknown', level: 'warning' }])
    expect(describeProblem(problems[0])).toBe('gamming is not a Paddock setting (typo?)')
  })

  it('warns when the cinema dims a light that does not exist', () => {
    const config = {
      ...minimal(),
      home: {
        alerts: { batteries: [], batteryLow: 10 },
        cinema: {
          toggle: 'input_boolean.cinema',
          dimLights: ['living', 'nowhere'],
          screen: { down: 'script.down', up: 'script.up' },
          projector: { on: 'script.on', off: 'script.off' },
          amplifier: 'switch.amplifier',
        },
      },
    }
    expect(validateConfig(config)).toEqual([{ path: 'home.cinema.dimLights[1]', kind: 'reference', expected: 'id of lighting.lights', level: 'warning' }])
  })

  it('puts errors before warnings', () => {
    const config = { ...minimal(), extra: 1, idleMinutes: 'two' }
    expect(validateConfig(config).map((p) => p.level)).toEqual(['error', 'warning'])
  })

  it('refuses something that is not a mapping', () => {
    expect(validateConfig(null)[0]).toMatchObject({ kind: 'type', level: 'error' })
  })
})

describe('configEntities', () => {
  it('lists every entity with where it is used', () => {
    expect(configEntities(minimal())).toEqual([
      { path: 'covers[0].entity', entity: 'cover.living_room' },
      { path: 'lighting.lights[0].entity', entity: 'light.living_room' },
      { path: 'people[0].entity', entity: 'person.alex' },
    ])
  })
})
