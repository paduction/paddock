import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { toggleZone, fixChoice, modeChoiceOf, modeOptionOf, robotDockCall, robotModeCall, robotPauseCall, robotSetModeCall, robotStartCall, toRobot, type ModeChoice, type Robot, type RobotConfig } from '@paddock/core'
import { ha } from '../ha'
import { useHass } from './hass.store'
import { createHold } from './hold'

/** Rooms ticked for the next run, per robot entity. */
export const useRoomSelection = create<Record<string, string[]>>()(() => ({}))
const modeHeld = createHold<string>()
/** Mode chosen for the next run, per robot entity (until it starts). */
const useNextMode = create<Record<string, ModeChoice>>()(() => ({}))

/** While the robot works, the picker shows (and changes) its current mode. */
const isBusy = (r: Robot) => ['cleaning', 'paused', 'returning'].includes(r.state)

/** Mode shown in the picker: the robot's own while it works, otherwise the one prepared for the next run. */
export function useModeChoice(cfg: RobotConfig, r: Robot): ModeChoice | null {
  const next = useNextMode((s) => s[cfg.entity])
  const grid = cfg.modes
  if (!grid) return null
  const current = modeChoiceOf(grid, r.mode)
  if (isBusy(r)) return current
  return fixChoice(grid, next ?? grid.default ?? current ?? { kind: grid.kinds[0].id, level: grid.levels[0].id }, r.modes)
}

export function useRobot(cfg: RobotConfig): Robot {
  const [e, battery, mode, error] = useHass(useShallow((s) => [s.entities[cfg.entity], cfg.battery ? s.entities[cfg.battery] : undefined, cfg.mode ? s.entities[cfg.mode] : undefined, cfg.error ? s.entities[cfg.error] : undefined]))
  const heldMode = modeHeld.useValue(cfg.entity)
  const robot = toRobot(cfg, e, battery, mode, error)
  return heldMode ? { ...robot, mode: heldMode } : robot
}

export const robots = {
  toggleRoom(cfg: RobotConfig, area: string) {
    useRoomSelection.setState((s) => {
      const current = s[cfg.entity] ?? []
      return { [cfg.entity]: current.includes(area) ? current.filter((a) => a !== area) : [...current, area] }
    })
  },
  toggleZone(cfg: RobotConfig, zone: string) {
    const rooms = cfg.zones?.find((z) => z.id === zone)?.rooms ?? []
    useRoomSelection.setState((s) => ({ [cfg.entity]: toggleZone(rooms, s[cfg.entity] ?? []) }))
  },
  clearRooms: (cfg: RobotConfig) => useRoomSelection.setState({ [cfg.entity]: [] }),
  /** Sets the prepared mode first when it differs from the robot's, then starts. The next run goes back to the default mode. */
  async start(cfg: RobotConfig, r: Robot, choice: ModeChoice | null) {
    const rooms = useRoomSelection.getState()[cfg.entity] ?? []
    if (rooms.length) robots.clearRooms(cfg)
    const option = cfg.mode && cfg.modes && choice && !isBusy(r) ? modeOptionOf(cfg.modes, choice, r.modes) : null
    if (cfg.mode && option && option !== r.mode) {
      modeHeld.hold(cfg.entity, option, 4000)
      if (!(await ha.call(robotSetModeCall(cfg.mode, option)))) return
    }
    useNextMode.setState((s) => {
      const { [cfg.entity]: _, ...rest } = s
      return rest
    }, true)
    ha.call(robotStartCall(cfg, rooms))
  },
  /** Picker change: prepared for the next run, or sent at once while the robot works. */
  setMode(cfg: RobotConfig, r: Robot, choice: ModeChoice) {
    if (!cfg.mode || !cfg.modes) return
    const fixed = fixChoice(cfg.modes, choice, r.modes)
    if (!isBusy(r)) return useNextMode.setState({ [cfg.entity]: fixed })
    const option = modeOptionOf(cfg.modes, fixed, r.modes)
    if (!option || option === r.mode) return
    modeHeld.hold(cfg.entity, option, 4000)
    ha.call(robotSetModeCall(cfg.mode, option))
  },
  pause: (cfg: RobotConfig, r: Robot) => ha.call(robotPauseCall(cfg, r)),
  dock: (cfg: RobotConfig) => ha.call(robotDockCall(cfg)),
  nextMode(cfg: RobotConfig, r: Robot) {
    const call = robotModeCall(cfg, r)
    if (!call) return
    modeHeld.hold(cfg.entity, String(call.data!.option), 4000)
    ha.call(call)
  },
}
