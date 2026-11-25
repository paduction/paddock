import { Icon } from '../Icon/Icon'
import { CloseButton, Sheet } from '../Sheet/Sheet'
import type { AgendaPerson } from '../AgendaCard/AgendaCard'
import styles from './AgendaSheet.module.css'

export interface AgendaListItem {
  key: string
  when: string
  title: string
  people: AgendaPerson[]
  selected: boolean
  past: boolean
  onSelect: () => void
}

export interface AgendaSheetProps {
  todayTitle: string
  laterTitle: string
  today: AgendaListItem[]
  later: AgendaListItem[]
  source: string
  detail: {
    when: string
    whenTone: 'accent' | 'green' | 'muted' | 'neutral'
    title: string
    rows: { icon: string; main: string; sub: string }[]
    notesTitle: string
    notes: string
  }
  closeLabel: string
  onClose: () => void
}

const TONES = { accent: 'var(--pd-accent-text)', green: 'var(--pd-green-text)', muted: 'var(--pd-text-3)', neutral: 'var(--pd-text-2)' }
const DOTS = ['var(--pd-accent)', 'var(--pd-blue)', 'var(--pd-green)', 'var(--pd-coral)']

function Row({ item }: { item: AgendaListItem }) {
  return (
    <button className={styles.row} style={{ background: item.selected ? 'var(--pd-surface)' : 'transparent', opacity: item.past ? 0.5 : 1 }} onClick={item.onSelect}>
      <span className={styles.rowWhen}>{item.when}</span>
      <div className={styles.dots}>
        {item.people.map((p) => (
          <span key={p.initial} className={styles.dot} style={{ background: DOTS[p.tone % 4] }} />
        ))}
      </div>
      <span className={styles.rowTitle}>{item.title}</span>
    </button>
  )
}

/** Agenda: list of the coming events on the left, details of the selected one on the right. */
export function AgendaSheet(p: AgendaSheetProps) {
  return (
    <Sheet className={styles.panel} frame={{ inset: 'auto', left: 170, top: 110, width: 860, height: 580 }} onClose={p.onClose}>
      <div className={styles.list}>
        <span className={styles.group}>{p.todayTitle}</span>
        {p.today.map((e) => (
          <Row key={e.key} item={e} />
        ))}
        <span className={`${styles.group} ${styles.groupLater}`}>{p.laterTitle}</span>
        {p.later.map((e) => (
          <Row key={e.key} item={e} />
        ))}
        <div className={styles.source}>
          <Icon name="sync" size={16} />
          {p.source}
        </div>
      </div>
      <div className={styles.detail}>
        <div className={styles.detailHead}>
          <div className={styles.detailTitles}>
            <span className={styles.when} style={{ color: TONES[p.detail.whenTone] }}>
              {p.detail.when}
            </span>
            <span className={styles.title}>{p.detail.title}</span>
          </div>
          <CloseButton label={p.closeLabel} onPress={p.onClose} />
        </div>
        <div className={styles.rows}>
          {p.detail.rows.map((r, i) => (
            <div key={i} className={styles.info}>
              <span className={styles.infoIcon}>
                <Icon name={r.icon} size={22} color="var(--pd-text-2)" />
              </span>
              <div className={styles.infoText}>
                <span className={styles.infoMain}>{r.main}</span>
                <span className={styles.infoSub}>{r.sub}</span>
              </div>
            </div>
          ))}
        </div>
        {p.detail.notes && (
          <div className={styles.notes}>
            <span className={styles.notesTitle}>{p.detail.notesTitle}</span>
            <span className={styles.notesText}>{p.detail.notes}</span>
          </div>
        )}
      </div>
    </Sheet>
  )
}
