import { useRef, useState, type PointerEvent } from 'react'
import { Artwork } from '../Artwork/Artwork'
import { Icon } from '../Icon/Icon'
import { useStage } from '../Stage/Stage'
import { bumpScale, useTween } from '../../hooks/useTween'
import { hideValueTooltip, ripple, showValueTooltip } from '../../feedback/feedback'
import styles from './MusicPlayer.module.css'

export interface MusicPlayerProps {
  source: string
  sourceActive: boolean
  counter: string
  artwork: string
  /** Shown when there is no picture, or when it cannot be loaded. */
  placeholderIcon?: string
  state: string
  stateIcon: string
  stateSpinning: boolean
  stateHighlight: boolean
  title: string
  artist: string
  album: string
  /** Seconds */
  duration: number
  position: number
  playing: boolean
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  volume: number
  shuffleLabel: string
  repeatLabel: string
  volumeTooltip: (volume: number) => string
  onPlay: () => void
  onPrevious: () => void
  onNext: () => void
  onShuffle: () => void
  onRepeat: () => void
  onSeek: (seconds: number) => void
  onVolume: (volume: number) => void
  onVolumeStep: (delta: number) => void
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Drag along a bar: returns 0–1 while moving, commits on release. */
function useBarDrag(onMove: (ratio: number, e: PointerEvent<HTMLDivElement>) => void, onCommit: (ratio: number) => void) {
  const { scale } = useStage()
  const drag = useRef<{ rect: DOMRect; ratio: number; bar: HTMLElement } | null>(null)
  const [active, setActive] = useState(false)
  const at = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    d.ratio = Math.max(0, Math.min(1, (e.clientX - d.rect.left) / d.rect.width))
    onMove(d.ratio, e)
  }
  return {
    active,
    handlers: {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        const bar = e.currentTarget.firstElementChild as HTMLElement
        drag.current = { rect: e.currentTarget.getBoundingClientRect(), ratio: 0, bar }
        ripple(e.clientX, e.clientY, scale)
        bar.style.height = `${parseFloat(getComputedStyle(bar).height) + 4}px`
        setActive(true)
        at(e)
      },
      onPointerMove: at,
      onPointerUp: () => {
        const d = drag.current
        drag.current = null
        if (!d) return
        d.bar.style.height = ''
        hideValueTooltip()
        setActive(false)
        onCommit(d.ratio)
      },
      onPointerCancel: () => {
        if (drag.current) drag.current.bar.style.height = ''
        drag.current = null
        hideValueTooltip()
        setActive(false)
      },
    },
  }
}

export function MusicPlayer(p: MusicPlayerProps) {
  const { scale } = useStage()
  const [seekTo, setSeekTo] = useState<number | null>(null)
  const [volumeTo, setVolumeTo] = useState<number | null>(null)
  const font = (e: PointerEvent<HTMLDivElement>) => getComputedStyle(e.currentTarget).fontFamily

  const seek = useBarDrag(
    (r, e) => {
      const sec = Math.round(r * p.duration)
      showValueTooltip(e.clientX, e.clientY, p.duration ? `${clock(sec)} / ${clock(Math.round(p.duration))}` : '—', Math.floor(sec / 10), scale, font(e))
      setSeekTo(sec)
    },
    (r) => {
      if (p.duration) p.onSeek(Math.round(r * p.duration))
      setTimeout(() => setSeekTo(null), 3000)
    },
  )
  const vol = useBarDrag(
    (r, e) => {
      const v = Math.round(r * 100)
      showValueTooltip(e.clientX, e.clientY, p.volumeTooltip(v), Math.round(v / 5), scale, font(e))
      setVolumeTo(v)
    },
    (r) => {
      p.onVolume(Math.round(r * 100))
      setTimeout(() => setVolumeTo(null), 3000)
    },
  )

  const position = seekTo ?? p.position
  const smooth = p.playing && seekTo === null && position > 0
  const progress = p.duration ? (position / p.duration) * 100 : 0
  const volume = useTween(volumeTo ?? p.volume, vol.active ? 40 : 80, 0.1)

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={p.sourceActive ? `${styles.source} ${styles.sourceOn}` : styles.source}>
          <Icon name="airplay" size={20} />
          {p.source}
        </span>
        <span className={styles.counter}>{p.counter}</span>
      </div>

      <div className={styles.now}>
        <div className={styles.art}>
          <Artwork src={p.artwork} className={styles.image} icon={p.placeholderIcon ?? 'music_note'} iconSize={72} />
        </div>
        <div className={styles.text}>
          <span className={styles.state} style={{ color: p.stateHighlight ? 'var(--pd-accent-text)' : 'var(--pd-text-2)' }}>
            <Icon name={p.stateIcon} size={20} filled className={p.stateSpinning ? styles.spin : undefined} style={{ display: 'inline-block' }} />
            {p.state}
          </span>
          <span className={styles.title}>{p.title}</span>
          <span className={styles.artist}>{p.artist}</span>
          <span className={styles.album}>{p.album}</span>
        </div>
      </div>

      <div>
        <div className={styles.seek} {...seek.handlers}>
          <div className={styles.seekTrack}>
            <div className={styles.seekFill} style={{ width: `${progress}%`, transition: smooth ? 'width 1s linear' : 'width .15s' }} />
            <span className={styles.seekKnob} style={{ left: `${progress}%`, transition: smooth ? 'left 1s linear' : 'left .15s' }} />
          </div>
        </div>
        <div className={styles.times}>
          <span>{clock(position)}</span>
          <span>{p.duration ? `-${clock(p.duration - position)}` : ''}</span>
        </div>
      </div>

      <div className={styles.transport}>
        <button title={p.shuffleLabel} className={p.shuffle ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle} onClick={p.onShuffle}>
          <Icon name="shuffle" size={26} />
        </button>
        <button className={styles.skip} onClick={p.onPrevious} aria-label="previous">
          <Icon name="skip_previous" size={34} filled />
        </button>
        <button className={styles.play} onClick={p.onPlay} aria-label="play">
          <Icon name={p.playing ? 'pause' : 'play_arrow'} size={48} filled />
        </button>
        <button className={styles.skip} onClick={p.onNext} aria-label="next">
          <Icon name="skip_next" size={34} filled />
        </button>
        <button title={p.repeatLabel} className={p.repeat !== 'off' ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle} onClick={p.onRepeat}>
          <Icon name={p.repeat === 'one' ? 'repeat_one' : 'repeat'} size={26} />
        </button>
      </div>

      <div className={styles.volume}>
        <button className={styles.volButton} onClick={() => p.onVolumeStep(-5)} aria-label="volume down">
          <Icon name="volume_down" size={22} />
        </button>
        <div className={styles.volArea} {...vol.handlers}>
          <div className={styles.volTrack}>
            <div className={styles.volFill} style={{ width: `${volume.value}%` }} />
          </div>
        </div>
        <span className={styles.volNumber} style={{ transform: bumpScale(volume.distance, 20, 0.16) }}>
          {Math.round(volume.value)}
        </span>
        <button className={styles.volButton} onClick={() => p.onVolumeStep(5)} aria-label="volume up">
          <Icon name="volume_up" size={22} />
        </button>
      </div>
    </div>
  )
}
