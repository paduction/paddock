import { Icon } from '../Icon/Icon'
import styles from './GameShelf.module.css'

export interface ShelfGame {
  key: string
  title: string
  image: string | null
  sub: string
  score?: { value: number | string; tone: 'good' | 'mixed' | 'bad' }
}

/** A row of game cards (upcoming games, best rated…). */
export function GameShelf({ title, games, empty, onOpen }: { title: string; games: ShelfGame[]; empty: string; onOpen?: (key: string) => void }) {
  return (
    <div className={styles.shelf}>
      <span className={styles.title}>{title}</span>
      {games.length === 0 ? (
        <div className={styles.empty}>{empty}</div>
      ) : (
        <div className={styles.row}>
          {games.map((g) => (
            <button key={g.key} className={styles.card} onClick={() => onOpen?.(g.key)}>
              <div className={styles.art}>
                {g.image ? <img src={g.image} alt="" loading="lazy" /> : <Icon name="sports_esports" size={40} filled color="var(--pd-text-3)" />}
                {g.score && <span className={`${styles.score} ${styles[g.score.tone]}`}>{g.score.value}</span>}
              </div>
              <span className={styles.name}>{g.title}</span>
              <span className={styles.sub}>{g.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
