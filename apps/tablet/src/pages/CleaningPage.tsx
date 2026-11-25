import { useState, type ReactNode } from 'react'
import { ModePicker, RobotActions, RobotBattery, RobotStatus, RobotStatusPill, RoomPicker, ZonePicker, type RobotAction, type RobotTone } from '@paddock/ui'
import { isCharging, modeOptionOf, selectedZone, zoneState, type ModeChoice, type Robot, type RobotConfig } from '@paddock/core'
import { config } from '../config'
import { t } from '../i18n'
import type { MessageKey } from '../i18n/fr'
import { robots, useModeChoice, useRobot, useRoomSelection } from '../stores/robots.store'
import styles from './CleaningPage.module.css'

const NONE: string[] = []
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Translated label, or the raw code made readable. */
function label(key: string, fallback: string) {
  const text = t(key as MessageKey)
  return text === key ? capitalize(fallback.replace(/_/g, ' ')) : text
}

const tone = (r: Robot): RobotTone => (r.state === 'cleaning' ? 'cleaning' : r.state === 'error' ? 'error' : 'idle')
const stateLabel = (r: Robot) => (isCharging(r) ? t('robot.charging') : label(`robot.${r.state}`, r.state))

function actions(cfg: RobotConfig, r: Robot, selection: string[], whole: boolean, choice: ModeChoice | null = null): RobotAction[] {
  const rooms = selection.length
  const zone = cfg.zones ? selectedZone(cfg.zones, selection) : null
  const on = r.state !== 'unavailable'
  const canStart = on && (r.state !== 'cleaning' || rooms > 0)
  return [
    {
      icon: 'play_arrow',
      label: zone ? t('robot.cleanZone', { name: zone.name }) : rooms ? t('robot.cleanRooms', { n: rooms }) : r.state === 'paused' ? t('robot.resume') : whole ? t('robot.wholeHouse') : t('robot.start'),
      primary: canStart,
      enabled: canStart,
      onPress: () => robots.start(cfg, r, choice),
    },
    { icon: r.canPause ? 'pause' : 'stop', label: t(r.canPause ? 'robot.pause' : 'robot.stop'), enabled: r.state === 'cleaning', onPress: () => robots.pause(cfg, r) },
    { icon: 'home', label: t('robot.dock'), enabled: ['cleaning', 'paused', 'idle', 'error'].includes(r.state), onPress: () => robots.dock(cfg) },
  ]
}

function Heading({ cfg, children }: { cfg: RobotConfig; children?: ReactNode }) {
  return (
    <div className={styles.heading}>
      <span className={styles.title}>{cfg.name}</span>
      <span className={styles.model}>{cfg.model}</span>
      {children}
    </div>
  )
}

/** Robot that cleans room by room (wide panel). */
function RoomsPanel({ cfg }: { cfg: RobotConfig }) {
  const r = useRobot(cfg)
  const selected = useRoomSelection((s) => s[cfg.entity] ?? NONE)
  const mode = r.mode ? (cfg.modeLabels?.[r.mode] ?? r.mode) : t('robot.noMode')
  const choice = useModeChoice(cfg, r)
  const [detail, setDetail] = useState(false)
  const names = new Map((cfg.rooms ?? []).map((room) => [room.area, room.name]))
  const grid = cfg.modes
  return (
    <div className={styles.panel}>
      {grid ? (
        <Heading cfg={cfg}>
          <RobotStatusPill tone={tone(r)} state={label(`robot.${r.state}`, r.state)} detail={r.error ? label(`robot.err.${r.error}`, r.error) : undefined} />
        </Heading>
      ) : (
        <>
          <Heading cfg={cfg} />
          <RobotStatus
            tone={tone(r)}
            state={label(`robot.${r.state}`, r.state)}
            detail={r.error ? label(`robot.err.${r.error}`, r.error) : undefined}
            mode={cfg.mode ? { label: mode, onPress: () => robots.nextMode(cfg, r) } : undefined}
          />
        </>
      )}
      {grid && choice && (
        <ModePicker
          disabled={!r.modes.length}
          rows={[
            {
              title: t('robot.kind'),
              options: grid.kinds.map((k) => ({ id: k.id, label: k.label, icon: k.icon })),
              value: choice.kind,
              onChange: (kind) => robots.setMode(cfg, r, { ...choice, kind }),
            },
            {
              title: t('robot.level'),
              options: grid.levels.map((l) => ({ id: l.id, label: l.label, icon: l.icon, disabled: !modeOptionOf(grid, { kind: choice.kind, level: l.id }, r.modes) })),
              value: choice.level,
              onChange: (level) => robots.setMode(cfg, r, { ...choice, level }),
            },
          ]}
        />
      )}
      {cfg.zones ? (
        <ZonePicker
          hint={selected.length ? t('robot.roomsChosen', { n: selected.length }) : t('robot.pickZones')}
          clearLabel={t('robot.clear')}
          detailLabel={t('robot.detail')}
          detail={detail}
          zones={cfg.zones.map((z) => {
            const state = zoneState(z.rooms, selected)
            const n = z.rooms.filter((room) => selected.includes(room)).length
            return {
              id: z.id,
              name: z.name,
              icon: z.icon,
              state,
              count: state === 'partial' ? t('robot.zonePartial', { n, total: z.rooms.length }) : t('robot.zoneRooms', { n: z.rooms.length }),
              summary: z.rooms.map((room) => names.get(room) ?? room).join(' · '),
              rooms: z.rooms.map((room) => ({ id: room, name: names.get(room) ?? room, selected: selected.includes(room) })),
            }
          })}
          onZone={(id) => robots.toggleZone(cfg, id)}
          onRoom={(id) => robots.toggleRoom(cfg, id)}
          onDetail={() => setDetail(!detail)}
          onClear={() => robots.clearRooms(cfg)}
        />
      ) : (
        <RoomPicker
          hint={selected.length ? t('robot.roomsChosen', { n: selected.length }) : t('robot.pickRooms')}
          clearLabel={t('robot.clear')}
          rooms={(cfg.rooms ?? []).map((room) => ({ id: room.area, name: room.name, selected: selected.includes(room.area) }))}
          onToggle={(area) => robots.toggleRoom(cfg, area)}
          onClear={() => robots.clearRooms(cfg)}
        />
      )}
      <RobotActions layout="row" actions={actions(cfg, r, selected, true, choice)} />
    </div>
  )
}

/** Simple robot: state, battery, buttons (narrow panel). */
function SimplePanel({ cfg }: { cfg: RobotConfig }) {
  const r = useRobot(cfg)
  return (
    <div className={styles.panel}>
      <Heading cfg={cfg} />
      <RobotBattery tone={tone(r)} state={stateLabel(r)} label={t('robot.battery')} battery={r.battery} />
      <RobotActions layout="column" actions={actions(cfg, r, NONE, false, useModeChoice(cfg, r))} />
    </div>
  )
}

export function CleaningPage() {
  const list = config.cleaning?.robots ?? []
  return (
    <div className={styles.page}>
      {list.map((cfg) => (cfg.rooms?.length ? <RoomsPanel key={cfg.entity} cfg={cfg} /> : <SimplePanel key={cfg.entity} cfg={cfg} />))}
    </div>
  )
}
