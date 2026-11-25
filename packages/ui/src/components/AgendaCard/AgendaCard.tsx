import styles from './AgendaCard.module.css'

/** A person concerned by an event. `tone` picks one of 4 colors (by person order). */
export interface AgendaPerson {
  initial: string
  name: string
  tone: number
}

export interface AgendaItem {
  when: string
  title: string
  meta?: string
  people: AgendaPerson[]
}

export interface AgendaCardProps {
  next: AgendaItem
  rest: AgendaItem[]
  onOpen?: (index: number) => void
}

const tone = (t: number) => styles[`tone${t % 4}`]

/** Next event (highlighted card) + the following ones (compact rows). */
export function AgendaCard({ next, rest, onOpen }: AgendaCardProps) {
  return (
    <>
      <button className={styles.next} onClick={() => onOpen?.(0)}>
        <div className={styles.nextHead}>
          <span className={styles.when}>{next.when}</span>
          <div className={styles.avatars}>
            {next.people.map((p) => (
              <span key={p.initial} title={p.name} className={`${styles.avatar} ${tone(p.tone)}`}>
                {p.initial}
              </span>
            ))}
          </div>
        </div>
        <span className={styles.title}>{next.title}</span>
        <span className={styles.meta}>{next.meta}</span>
      </button>
      <div className={styles.rows}>
        {rest.map((e, i) => (
          <button key={i} className={styles.row} onClick={() => onOpen?.(i + 1)}>
            <span className={styles.rowWhen}>{e.when}</span>
            <div className={styles.dots}>
              {e.people.map((p) => (
                <span key={p.initial} title={p.name} className={`${styles.dot} ${tone(p.tone)}`} />
              ))}
            </div>
            <span className={styles.rowTitle}>{e.title}</span>
          </button>
        ))}
      </div>
    </>
  )
}
