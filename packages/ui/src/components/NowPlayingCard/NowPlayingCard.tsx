import { Artwork } from '../Artwork/Artwork'
import { Icon } from '../Icon/Icon'
import { useTween } from '../../hooks/useTween'
import styles from './NowPlayingCard.module.css'

export interface NowPlayingCardProps {
  state: string
  playing: boolean
  title: string
  subtitle: string
  artwork: string | null
  placeholderIcon: string
  /** 0–100 */
  volume: number
  onPlayPause: () => void
  onPrevious: () => void
  onNext: () => void
  onVolume: (delta: number) => void
}

/** What a TV / player is playing, with transport and volume. */
export function NowPlayingCard(p: NowPlayingCardProps) {
  const volume = useTween(p.volume, 80, 0.1)
  return (
    <div className={styles.card}>
      <div className={styles.media}>
        <div className={styles.art}>
          <Artwork src={p.artwork} className={styles.image} icon={p.placeholderIcon} iconSize={32} />
        </div>
        <div className={styles.text}>
          <div className={styles.state} style={{ color: p.playing ? 'var(--pd-accent-text)' : 'var(--pd-text-2)' }}>
            {p.state}
          </div>
          <div className={styles.title}>{p.title}</div>
          <div className={styles.subtitle}>{p.subtitle}</div>
        </div>
      </div>
      <div className={styles.transport}>
        <button className={styles.round} onClick={p.onPrevious} aria-label="previous">
          <Icon name="skip_previous" size={26} filled />
        </button>
        <button className={styles.play} onClick={p.onPlayPause} aria-label="play">
          <Icon name={p.playing ? 'pause' : 'play_arrow'} size={36} filled />
        </button>
        <button className={styles.round} onClick={p.onNext} aria-label="next">
          <Icon name="skip_next" size={26} filled />
        </button>
      </div>
      <div className={styles.volume}>
        <button className={styles.small} onClick={() => p.onVolume(-5)} aria-label="volume down">
          <Icon name="volume_down" size={22} />
        </button>
        <div className={styles.track}>
          <div className={styles.level} style={{ width: `${volume.value}%` }} />
        </div>
        <span className={styles.number}>{Math.round(volume.value)}</span>
        <button className={styles.small} onClick={() => p.onVolume(5)} aria-label="volume up">
          <Icon name="volume_up" size={22} />
        </button>
      </div>
    </div>
  )
}
