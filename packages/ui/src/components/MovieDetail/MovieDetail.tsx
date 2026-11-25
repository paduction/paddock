import type { ReactNode } from 'react'
import { Icon } from '../Icon/Icon'
import styles from './MovieDetail.module.css'

export interface CastMember {
  name: string
  role: string
  photo: string
}

export interface MovieDetailProps {
  title: string
  poster: string
  backdrop: string
  meta: string
  genres: string[]
  summary: string
  credits: string
  cast: CastMember[]
  /** e.g. "Watch on [Cinema | Living room]" — only when there is a choice. */
  target?: ReactNode
  playLabel: string
  playBusy: boolean
  hint: string
  onPlay: () => void
  onClose: () => void
}

/** Full-screen movie sheet over a blurred backdrop. */
export function MovieDetail(p: MovieDetailProps) {
  return (
    <div className={styles.overlay} onClick={p.onClose}>
      {p.backdrop && <img src={p.backdrop} alt="" className={styles.backdrop} />}
      <div className={styles.shade} />
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <img src={p.poster} alt="" className={styles.poster} />
        <div className={styles.info}>
          <div className={styles.title}>{p.title}</div>
          <div className={styles.meta}>{p.meta}</div>
          <div className={styles.genres}>
            {p.genres.map((g) => (
              <span key={g} className={styles.genre}>
                {g}
              </span>
            ))}
          </div>
          <div className={styles.summary}>{p.summary}</div>
          <div className={styles.credits}>{p.credits}</div>
          {p.cast.length > 0 && (
            <div className={styles.cast}>
              {p.cast.map((c) => (
                <div key={c.name} className={styles.person}>
                  <div className={styles.photo}>
                    {c.name.charAt(0)}
                    {c.photo && <img src={c.photo} alt="" loading="lazy" className={styles.photoImage} />}
                  </div>
                  <span className={styles.personName}>{c.name}</span>
                  <span className={styles.role}>{c.role}</span>
                </div>
              ))}
            </div>
          )}
          {p.target}
          <div className={styles.actions}>
            <button className={styles.play} onClick={p.onPlay}>
              <Icon name={p.playBusy ? 'progress_activity' : 'live_tv'} size={30} filled className={p.playBusy ? styles.spin : undefined} style={{ display: 'inline-block' }} />
              {p.playLabel}
            </button>
            <span className={styles.hint}>{p.hint}</span>
          </div>
        </div>
        <button className={styles.close} onClick={p.onClose} aria-label="close">
          <Icon name="close" size={26} />
        </button>
      </div>
    </div>
  )
}
