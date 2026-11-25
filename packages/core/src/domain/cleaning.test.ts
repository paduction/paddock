import { describe, expect, it } from 'vitest'
import { fixChoice, modeChoiceOf, modeOptionOf, selectedZone, toggleZone, zoneState } from './cleaning'
import type { RobotModesConfig } from '../config/schema'

const grid: RobotModesConfig = {
  kinds: [{ id: 'vac', label: 'Vac' }, { id: 'mop', label: 'Mop' }, { id: 'both', label: 'Both' }],
  levels: [{ id: 'quick', label: 'Quick' }, { id: 'normal', label: 'Normal' }, { id: 'deep', label: 'Deep' }, { id: 'quiet', label: 'Quiet' }],
  options: {
    vac: { quick: 'Quick Vac', normal: 'Auto Vac', deep: 'Deep Clean Vac', quiet: 'Quiet Vac' },
    mop: { quick: 'Quick Mop', normal: 'Auto Mop', deep: 'Deep Clean Mop' },
    both: { quick: 'Quick Vac And Mop', normal: 'Auto Vac And Mop', deep: 'Deep Clean Vac And Mop', quiet: 'Quiet Vac And Mop' },
  },
  default: { kind: 'both', level: 'normal' },
}

describe('robot mode grid', () => {
  it('maps options both ways', () => {
    expect(modeChoiceOf(grid, 'Deep Clean Mop')).toEqual({ kind: 'mop', level: 'deep' })
    expect(modeOptionOf(grid, { kind: 'both', level: 'normal' })).toBe('Auto Vac And Mop')
    expect(modeChoiceOf(grid, 'Turbo')).toBeNull()
  })
  it('falls back to a level that exists', () => {
    expect(fixChoice(grid, { kind: 'mop', level: 'quiet' })).toEqual({ kind: 'mop', level: 'normal' })
    expect(fixChoice(grid, { kind: 'vac', level: 'quiet' })).toEqual({ kind: 'vac', level: 'quiet' })
  })
  it('ignores options the robot does not offer', () => {
    expect(modeOptionOf(grid, { kind: 'vac', level: 'quiet' }, ['Auto Vac'])).toBeNull()
    expect(fixChoice(grid, { kind: 'vac', level: 'quiet' }, ['Auto Vac'])).toEqual({ kind: 'vac', level: 'normal' })
  })
})

describe('robot zones', () => {
  const bedrooms = ['a', 'b', 'c']
  it('tells how much of a zone is selected', () => {
    expect(zoneState(bedrooms, [])).toBe('off')
    expect(zoneState(bedrooms, ['a', 'x'])).toBe('partial')
    expect(zoneState(bedrooms, ['c', 'b', 'a'])).toBe('on')
  })
  it('selects a whole zone, then clears it', () => {
    expect(toggleZone(bedrooms, ['x', 'a'])).toEqual(['x', 'a', 'b', 'c'])
    expect(toggleZone(bedrooms, ['x', 'a', 'b', 'c'])).toEqual(['x'])
  })
  it('finds the zone matching the selection', () => {
    const zones = [{ id: 'z', rooms: bedrooms }]
    expect(selectedZone(zones, ['b', 'c', 'a'])?.id).toBe('z')
    expect(selectedZone(zones, ['a', 'b'])).toBeNull()
  })
})
