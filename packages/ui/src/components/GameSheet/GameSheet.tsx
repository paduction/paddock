import { useState } from 'react'
import { Icon } from '../Icon/Icon'
import { CloseButton, Sheet } from '../Sheet/Sheet'
import { VideoOverlay, type VideoBlocked } from '../VideoPlayer/VideoPlayer'
import styles from './GameSheet.module.css'

export interface GameSheetProps {
  title: string
  closeLabel: string
  onClose: () => void
  game: {
    kicker: string
    active: boolean
    title: string
    cover: string | null
    /** Metacritic */
    score?: { value: number; tone: 'good' | 'mixed' | 'bad'; label: string }
    /** "2024 · Platformer, Action" */
    meta?: string
    /** Age rating, average play time… */
    chips?: { icon: string; label: string }[]
    /** Tap one: shown large instead of the cover */
    screenshots?: string[]
  }
  about?: {
    title: string
    description: string
    credits: { label: string; value: string }[]
    source: { label: string; links: { label: string; href: string }[] }
  }
  /** e.g. This session · Today · 7 days */
  stats: { label: string; value: string }[]
  sessions: { title: string; items: { key: string; title: string; cover: string | null; when: string; duration: string; active: boolean }[]; empty: string }
  /** Most played games; replaced by `videos` when given */
  top?: { title: string; items: { title: string; cover: string | null; value: string; ratio: number }[]; empty: string }
  /** Trailers of the game: played in the big picture on the left */
  videos?: { title: string; empty: string; items: { id: string; thumb: string; embed: string }[] }
  videoBlocked?: VideoBlocked
  keepAwake?: () => void
  /** Called when a trailer opens; the returned function runs when it closes */
  onVideo?: () => () => void
  trophies?: { title: string; level: string; next: number; nextLabel: string; counts: { label: string; value: string; color: string }[] }
}

function Cover({ src, size }: { src: string | null; size: number }) {
  return (
    <span className={styles.thumb} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" /> : <Icon name="sports_esports" size={Math.round(size * 0.5)} filled color="var(--pd-text-3)" />}
    </span>
  )
}

/** Game console details: current / last game, play time, sessions, most played games, trophies. */
export function GameSheet(p: GameSheetProps) {
  const [shown, setShown] = useState<string | null>(null)
  const [video, setVideo] = useState<string | null>(null)
  const playing = p.videos?.items.find((v) => v.id === video) ?? null
  const big = shown ?? p.game.cover
  const pick = (src: string | null) => setShown(src)
  return (
    <Sheet className={styles.panel} onClose={p.onClose}>
      <div className={styles.left}>
        <button className={styles.cover} onClick={() => pick(null)}>
          {big ? <img src={big} alt="" /> : <Icon name="sports_esports" size={96} filled color="var(--pd-text-3)" />}
        </button>
        <span className={styles.kicker} style={{ color: p.game.active ? 'var(--pd-accent-text)' : 'var(--pd-text-3)' }}>
          {p.game.kicker}
        </span>
        <span className={styles.gameTitle}>{p.game.title}</span>
        {(p.game.score || p.game.meta) && (
          <div className={styles.metaRow}>
            {p.game.score && (
              <span className={styles.scoreBox}>
                <span className={`${styles.score} ${styles[p.game.score.tone]}`}>{p.game.score.value}</span>
                <span className={styles.scoreLabel}>{p.game.score.label}</span>
              </span>
            )}
            {p.game.meta && <span className={styles.meta}>{p.game.meta}</span>}
          </div>
        )}
        {p.game.chips && p.game.chips.length > 0 && (
          <div className={styles.chips}>
            {p.game.chips.map((c) => (
              <span key={c.label} className={styles.chip}>
                <Icon name={c.icon} size={16} />
                {c.label}
              </span>
            ))}
          </div>
        )}
        {p.game.screenshots && p.game.screenshots.length > 0 ? (
          <div className={styles.shots}>
            {p.game.screenshots.map((src) => (
              <button key={src} className={src === shown ? `${styles.shot} ${styles.shotOn}` : styles.shot} onClick={() => pick(src === shown ? null : src)}>
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.spacer} />
        )}
        <div className={styles.stats}>
          {p.stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statValue}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.head}>
          <span className={styles.title}>{p.title}</span>
          <CloseButton label={p.closeLabel} onPress={p.onClose} />
        </div>
        {p.about && (
          <div className={styles.about}>
            <span className={styles.blockTitle}>{p.about.title}</span>
            {p.about.description && <p className={styles.description}>{p.about.description}</p>}
            {p.about.credits.length > 0 && (
              <div className={styles.credits}>
                {p.about.credits.map((c) => (
                  <div key={c.label} className={styles.credit}>
                    <span className={styles.creditLabel}>{c.label}</span>
                    <span className={styles.creditValue}>{c.value}</span>
                  </div>
                ))}
              </div>
            )}
            <span className={styles.source}>
              {p.about.source.label}{' '}
              {p.about.source.links.map((l, i) => (
                <span key={l.href}>
                  {i > 0 && ' · '}
                  <a href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                </span>
              ))}
            </span>
          </div>
        )}
        {p.trophies && (
          <div className={styles.trophies}>
            <div className={styles.level}>
              <Icon name="trophy" size={28} filled color="var(--pd-accent-text)" />
              <div className={styles.levelText}>
                <span className={styles.levelValue}>{p.trophies.level}</span>
                <span className={styles.levelLabel}>{p.trophies.nextLabel}</span>
              </div>
              <div className={styles.levelBar}>
                <span style={{ width: `${Math.max(0, Math.min(100, p.trophies.next))}%` }} />
              </div>
            </div>
            <div className={styles.counts}>
              {p.trophies.counts.map((c) => (
                <div key={c.label} className={styles.count}>
                  <span className={styles.countDot} style={{ background: c.color }} />
                  <span className={styles.countValue}>{c.value}</span>
                  <span className={styles.countLabel}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={styles.columns}>
          <div className={styles.block}>
            <span className={styles.blockTitle}>{p.sessions.title}</span>
            {p.sessions.items.length === 0 && <span className={styles.empty}>{p.sessions.empty}</span>}
            {p.sessions.items.map((s) => (
              <div key={s.key} className={styles.row}>
                <Cover src={s.cover} size={44} />
                <div className={styles.rowText}>
                  <span className={styles.rowTitle}>{s.title}</span>
                  <span className={styles.rowSub} style={{ color: s.active ? 'var(--pd-accent-text)' : undefined }}>
                    {s.when}
                  </span>
                </div>
                <span className={styles.rowValue}>{s.duration}</span>
              </div>
            ))}
          </div>
          {p.videos ? (
            <div className={styles.block}>
              <span className={styles.blockTitle}>{p.videos.title}</span>
              {p.videos.items.length === 0 && <span className={styles.empty}>{p.videos.empty}</span>}
              <div className={styles.videos}>
                {p.videos.items.map((v) => (
                  <button key={v.id} className={styles.video} onClick={() => setVideo(v.id)}>
                    <img src={v.thumb} alt="" loading="lazy" />
                    <span className={styles.play}>
                      <Icon name="play_arrow" size={26} filled />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : p.top ? (
            <div className={styles.block}>
              <span className={styles.blockTitle}>{p.top.title}</span>
              {p.top.items.length === 0 && <span className={styles.empty}>{p.top.empty}</span>}
              {p.top.items.map((g) => (
                <div key={g.title} className={styles.topRow}>
                  <Cover src={g.cover} size={44} />
                  <div className={styles.rowText}>
                    <div className={styles.topLine}>
                      <span className={styles.rowTitle}>{g.title}</span>
                      <span className={styles.rowValue}>{g.value}</span>
                    </div>
                    <div className={styles.bar}>
                      <span style={{ width: `${Math.max(4, g.ratio * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {playing && p.videoBlocked && (
        <VideoOverlay
          id={playing.id}
          embed={playing.embed}
          thumb={playing.thumb}
          title={p.game.title}
          blocked={p.videoBlocked}
          closeLabel={p.closeLabel}
          onClose={() => setVideo(null)}
          keepAwake={p.keepAwake}
          onOpen={p.onVideo}
        />
      )}
    </Sheet>
  )
}
