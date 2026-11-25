import type { MouseEvent } from 'react'
import { Icon } from '../Icon/Icon'
import styles from './MiniPlayer.module.css'

export interface MiniPlayerProps {
  title: string
  artist: string
  artwork: string | null
  playing: boolean
  /** 0–100 */
  progress: number
  elapsed: string
  remaining: string
  onOpen: () => void
  onPlayPause: () => void
  onStop: () => void
}

/** Compact "now playing" card. */
export function MiniPlayer(p: MiniPlayerProps) {
  const stop = (handler: () => void) => (e: MouseEvent) => {
    e.stopPropagation()
    handler()
  }
  return (
    <div className={styles.player} onClick={p.onOpen}>
      <div className={styles.row}>
        <div className={styles.art}>
          {p.artwork ? <img src={p.artwork} alt="" className={styles.image} /> : <Icon name="music_note" size={22} color="var(--pd-text-2)" />}
        </div>
        <div className={styles.text}>
          <span className={styles.title}>{p.title}</span>
          <span className={styles.artist}>{p.artist}</span>
        </div>
        <button className={styles.close} onClick={stop(p.onStop)}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className={styles.row}>
        <button className={styles.play} onClick={stop(p.onPlayPause)}>
          <Icon name={p.playing ? 'pause' : 'play_arrow'} size={22} filled />
        </button>
        <div className={styles.progress}>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${p.progress}%`, transition: p.playing ? 'width 1s linear' : 'none' }} />
          </div>
          <div className={styles.times}>
            <span>{p.elapsed}</span>
            <span>{p.remaining}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
