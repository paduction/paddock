import { Icon } from '../Icon/Icon'
import styles from './GamePanel.module.css'

export type GameStatusTone = 'online' | 'away' | 'standby' | 'offline'

export interface GamePanelProps {
  title: string
  status: { label: string; tone: GameStatusTone }
  game: {
    /** "Now playing · 45 min", "Last game · yesterday 21:30"… */
    kicker: string
    active: boolean
    title: string
    /** "1 h 40 · 6 h 15 over 7 days", or a hint when there is no game yet */
    detail?: string
    cover: string | null
    /** Metacritic score on the cover */
    score?: { value: number; tone: 'good' | 'mixed' | 'bad' }
  }
  /** Tap on the game: details */
  onOpen?: () => void
  account?: { name: string; detail: string; avatar: string | null }
  power?: { label: string; icon: string; primary: boolean; enabled: boolean; onPress: () => void }
}

/** Game console column: what is being played, the account, power. */
export function GamePanel({ title, status, game, account, power, onOpen }: GamePanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={`${styles.status} ${styles[status.tone]}`}>
          <span className={styles.dot} />
          {status.label}
        </span>
      </div>
      <button className={styles.hero} onClick={onOpen}>
        <div className={styles.art}>
          {game.cover ? (
            <img src={game.cover} alt="" className={styles.cover} />
          ) : (
            <div className={styles.placeholder}>
              <Icon name="sports_esports" size={64} filled color="var(--pd-text-3)" />
            </div>
          )}
          <div className={styles.shade} />
          {game.score && <span className={`${styles.score} ${styles[game.score.tone]}`}>{game.score.value}</span>}
          {onOpen && (
            <span className={styles.more}>
              <Icon name="open_in_full" size={18} />
            </span>
          )}
        </div>
        <div className={styles.info}>
          <span className={styles.kicker} style={{ color: game.active ? 'var(--pd-accent-text)' : 'var(--pd-text-3)' }}>
            {game.kicker}
          </span>
          <span className={styles.game}>{game.title}</span>
          {game.detail && <span className={styles.detail}>{game.detail}</span>}
        </div>
      </button>
      {account && (
        <div className={styles.account}>
          <span className={styles.avatar}>{account.avatar ? <img src={account.avatar} alt="" /> : account.name.charAt(0).toUpperCase()}</span>
          <div className={styles.accountText}>
            <span className={styles.accountName}>{account.name}</span>
            <span className={styles.accountDetail}>{account.detail}</span>
          </div>
          <Icon name="trophy" size={22} filled color="var(--pd-accent-text)" />
        </div>
      )}
      {power && (
        <button
          className={power.primary ? `${styles.power} ${styles.powerPrimary}` : styles.power}
          style={{ opacity: power.enabled ? 1 : 0.4 }}
          onClick={power.enabled ? power.onPress : undefined}
        >
          <Icon name={power.icon} size={26} filled />
          {power.label}
        </button>
      )}
    </div>
  )
}
