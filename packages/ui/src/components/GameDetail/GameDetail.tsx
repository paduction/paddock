import { useState } from 'react'
import { Icon } from '../Icon/Icon'
import { CloseButton, Sheet } from '../Sheet/Sheet'
import { VideoOverlay, type VideoBlocked } from '../VideoPlayer/VideoPlayer'
import styles from './GameDetail.module.css'

export type GameMedia = { kind: 'video'; key: string; id: string; thumb: string; embed: string } | { kind: 'image'; key: string; thumb: string; large: string }

export interface GameDetailProps {
  closeLabel: string
  onClose: () => void
  loading?: string
  kicker: string
  title: string
  score?: { value: number | string; tone: 'good' | 'mixed' | 'bad'; label: string }
  chips: { icon: string; label: string }[]
  facts: { label: string; value: string }[]
  media: GameMedia[]
  cover: string | null
  descriptionTitle: string
  description: string
  source?: { label: string; links: { label: string; href: string }[] }
  /** When YouTube refuses to play a video here (age restriction, embedding disabled) */
  videoBlocked: VideoBlocked
  keepAwake?: () => void
  /** Called when a trailer opens; the returned function runs when it closes */
  onVideo?: () => () => void
}

/** Full page of a game: trailers and screenshots, description, credits. */
export function GameDetail(p: GameDetailProps) {
  const [current, setCurrent] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState<string | null>(null)
  const shown = p.media.find((m) => m.key === current && m.kind === 'image') ?? p.media.find((m) => m.kind === 'image') ?? null
  const video = p.media.find((m) => m.key === fullscreen && m.kind === 'video')

  return (
    <Sheet className={styles.panel} onClose={p.onClose}>
      <div className={styles.left}>
        <div className={styles.viewer}>
          {shown?.kind === 'image' ? (
            <img src={shown.large} alt="" className={styles.image} />
          ) : p.cover ? (
            <img src={p.cover} alt="" className={styles.image} />
          ) : (
            <Icon name="sports_esports" size={96} filled color="var(--pd-text-3)" />
          )}
        </div>
        {p.media.length > 0 && (
          <div className={styles.strip}>
            {p.media.map((m) => (
              <button
                key={m.key}
                className={m.key === shown?.key ? `${styles.thumb} ${styles.thumbOn}` : styles.thumb}
                onClick={() => (m.kind === 'video' ? setFullscreen(m.key) : setCurrent(m.key))}
              >
                <img src={m.thumb} alt="" loading="lazy" />
                {m.kind === 'video' && (
                  <span className={styles.play}>
                    <Icon name="play_arrow" size={22} filled />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className={styles.about}>
          <span className={styles.blockTitle}>{p.descriptionTitle}</span>
          <p className={styles.description}>{p.description || p.loading}</p>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.head}>
          <span className={styles.kicker}>{p.kicker}</span>
          <CloseButton label={p.closeLabel} onPress={p.onClose} />
        </div>
        <span className={styles.title}>{p.title}</span>
        {(p.score || p.chips.length > 0) && (
          <div className={styles.badges}>
            {p.score && (
              <span className={styles.scoreBox}>
                <span className={`${styles.score} ${styles[p.score.tone]}`}>{p.score.value}</span>
                <span className={styles.scoreLabel}>{p.score.label}</span>
              </span>
            )}
            {p.chips.map((c) => (
              <span key={c.label} className={styles.chip}>
                <Icon name={c.icon} size={16} />
                {c.label}
              </span>
            ))}
          </div>
        )}
        <div className={styles.facts}>
          {p.facts.map((f) => (
            <div key={f.label} className={styles.fact}>
              <span className={styles.factLabel}>{f.label}</span>
              <span className={styles.factValue}>{f.value}</span>
            </div>
          ))}
        </div>
        {p.source && p.source.links.length > 0 && (
          <span className={styles.source}>
            {p.source.label}{' '}
            {p.source.links.map((l, i) => (
              <span key={l.href}>
                {i > 0 && ' · '}
                <a href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </span>
            ))}
          </span>
        )}
      </div>
      {video?.kind === 'video' && (
        <VideoOverlay
          id={video.id}
          embed={video.embed}
          thumb={video.thumb}
          title={p.title}
          blocked={p.videoBlocked}
          closeLabel={p.closeLabel}
          onClose={() => setFullscreen(null)}
          keepAwake={p.keepAwake}
          onOpen={p.onVideo}
        />
      )}
    </Sheet>
  )
}
