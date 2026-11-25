import { Icon } from '../Icon/Icon'
import { Segmented, type SegmentOption } from '../Segmented/Segmented'
import { useTween } from '../../hooks/useTween'
import styles from './Robot.module.css'

export type RobotTone = 'idle' | 'cleaning' | 'error'

function RobotIcon({ tone, small }: { tone: RobotTone; small?: boolean }) {
  return (
    <div className={`${styles.icon} ${styles[tone]} ${small ? styles.iconSmall : ''}`}>
      <Icon name="cleaning_services" size={small ? 22 : 32} filled />
    </div>
  )
}

/** Robot state as a pill, for a panel heading. */
export function RobotStatusPill({ tone, state, detail }: { tone: RobotTone; state: string; detail?: string }) {
  return (
    <div className={styles.pill}>
      <RobotIcon tone={tone} small />
      <span className={styles.pillState}>{state}</span>
      {detail && <span className={styles.pillDetail}>{detail}</span>}
    </div>
  )
}

export interface RobotStatusProps {
  tone: RobotTone
  state: string
  detail?: string
  mode?: { label: string; onPress: () => void }
}

/** Robot state in a card, with an optional mode switcher. */
export function RobotStatus({ tone, state, detail, mode }: RobotStatusProps) {
  return (
    <div className={styles.status}>
      <RobotIcon tone={tone} />
      <div className={styles.statusText}>
        <div className={styles.state}>{state}</div>
        {detail && <div className={styles.detail}>{detail}</div>}
      </div>
      {mode && (
        <button className={styles.mode} onClick={mode.onPress}>
          <Icon name="tune" size={20} color="var(--pd-accent-text)" />
          {mode.label}
          <Icon name="sync" size={20} color="var(--pd-text-2)" />
        </button>
      )}
    </div>
  )
}

export interface RobotBatteryProps {
  tone: RobotTone
  state: string
  label: string
  battery: number | null
}

/** Bigger card: state + battery bar. */
export function RobotBattery({ tone, state, label, battery }: RobotBatteryProps) {
  const level = useTween(battery ?? 0, 300, 0.1).value
  return (
    <div className={styles.batteryCard}>
      <div className={styles.batteryHead}>
        <RobotIcon tone={tone} />
        <div className={styles.state}>{state}</div>
      </div>
      <div>
        <div className={styles.batteryLine}>
          <span>{label}</span>
          <span className={styles.batteryValue}>{battery === null ? '—' : Math.round(level)} %</span>
        </div>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${battery === null ? 0 : level}%` }} />
        </div>
      </div>
    </div>
  )
}

export interface RoomPickerProps {
  hint: string
  clearLabel: string
  rooms: { id: string; name: string; selected: boolean }[]
  onToggle: (id: string) => void
  onClear: () => void
}

export function RoomPicker({ hint, clearLabel, rooms, onToggle, onClear }: RoomPickerProps) {
  const any = rooms.some((r) => r.selected)
  return (
    <>
      <div className={styles.roomsHead}>
        <span className={styles.hint}>{hint}</span>
        <button className={styles.clear} style={{ opacity: any ? 1 : 0 }} onClick={onClear}>
          {clearLabel}
        </button>
      </div>
      <div className={styles.rooms}>
        {rooms.map((r) => (
          <button key={r.id} className={r.selected ? `${styles.room} ${styles.roomOn}` : styles.room} onClick={() => onToggle(r.id)}>
            {r.name}
          </button>
        ))}
      </div>
    </>
  )
}

export interface RobotAction {
  icon: string
  label: string
  primary?: boolean
  enabled: boolean
  onPress: () => void
}

/** Start / pause / dock. `layout="row"` for the wide panel, `"column"` for the narrow one. */
export function RobotActions({ actions, layout }: { actions: RobotAction[]; layout: 'row' | 'column' }) {
  return (
    <div className={layout === 'row' ? styles.actionsRow : styles.actionsColumn}>
      {actions.map((a) => (
        <button
          key={a.label}
          className={a.primary ? `${styles.action} ${styles.primary}` : styles.action}
          style={{ opacity: a.enabled ? 1 : 0.4 }}
          onClick={a.enabled ? a.onPress : undefined}
        >
          <Icon name={a.icon} size={26} filled />
          {a.label}
        </button>
      ))}
    </div>
  )
}

export interface ModePickerRow {
  title: string
  options: SegmentOption[]
  value: string
  onChange: (id: string) => void
}

/** Cleaning mode as two rows: what (vacuum, mop, both) and how hard. */
export function ModePicker({ rows, disabled }: { rows: ModePickerRow[]; disabled?: boolean }) {
  return (
    <div className={styles.modePicker}>
      {rows.map((row) => (
        <div key={row.title} className={styles.modeRow}>
          <span className={styles.modeTitle}>{row.title}</span>
          <div className={styles.modeChoices}>
            <Segmented options={row.options} value={row.value} onChange={row.onChange} size="sm" compact stretch disabled={disabled} />
          </div>
        </div>
      ))}
    </div>
  )
}

export interface ZoneView {
  id: string
  name: string
  icon: string
  /** "4 pièces", "2 sur 4"… */
  count: string
  /** Room names, shown when the zones are folded */
  summary: string
  state: 'off' | 'partial' | 'on'
  rooms: { id: string; name: string; selected: boolean }[]
}

export interface ZonePickerProps {
  hint: string
  clearLabel: string
  detailLabel: string
  detail: boolean
  zones: ZoneView[]
  onZone: (id: string) => void
  onRoom: (id: string) => void
  onDetail: () => void
  onClear: () => void
}

/** Rooms grouped by zone: one column per zone, the rooms appear under each zone in detail mode. */
export function ZonePicker(p: ZonePickerProps) {
  const any = p.zones.some((z) => z.state !== 'off')
  // Same row height in every column, sized for the biggest zone
  const rows = Math.max(1, ...p.zones.map((z) => z.rooms.length))
  return (
    <>
      <div className={styles.roomsHead}>
        <span className={styles.hint}>{p.hint}</span>
        <div className={styles.headButtons}>
          <button className={styles.clear} style={{ opacity: any ? 1 : 0 }} onClick={any ? p.onClear : undefined}>
            {p.clearLabel}
          </button>
          <button className={p.detail ? `${styles.clear} ${styles.detailOn}` : styles.clear} onClick={p.onDetail}>
            {p.detailLabel}
            <Icon name={p.detail ? 'expand_less' : 'expand_more'} size={18} />
          </button>
        </div>
      </div>
      <div className={styles.zones} style={{ gridTemplateColumns: `repeat(${p.zones.length}, minmax(0, 1fr))` }}>
        {p.zones.map((z) => (
          <div key={z.id} className={styles.zoneColumn}>
            <button className={`${styles.zone} ${styles[`zone_${z.state}`]} ${p.detail ? styles.zoneSmall : ''}`} onClick={() => p.onZone(z.id)}>
              <span className={styles.zoneIcon}>
                <Icon name={z.icon} size={p.detail ? 22 : 30} filled />
              </span>
              <span className={styles.zoneText}>
                <span className={styles.zoneName}>{z.name}</span>
                <span className={styles.zoneCount}>{z.count}</span>
              </span>
              {!p.detail && <span className={styles.zoneSummary}>{z.summary}</span>}
            </button>
            {p.detail && (
              <div className={styles.zoneRooms} style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
                {z.rooms.map((r) => (
                  <button key={r.id} className={r.selected ? `${styles.room} ${styles.roomOn}` : styles.room} onClick={() => p.onRoom(r.id)}>
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

