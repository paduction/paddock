import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStage } from '../Stage/Stage'
import { Icon } from '../Icon/Icon'
import styles from './VideoPlayer.module.css'

export interface VideoBlocked {
  title: string
  text: string
  sentLabel: string
  /** e.g. the Apple TVs: open the video in their YouTube app */
  targets: { label: string; icon: string; onPress: (videoId: string) => void }[]
}

export interface VideoPlayerProps {
  /** YouTube id */
  id: string
  embed: string
  thumb: string
  title: string
  blocked: VideoBlocked
}

/**
 * YouTube embed that notices when YouTube refuses to play the video here
 * (error 150/101: age-restricted or embedding disabled) and then offers other screens.
 */
export function VideoPlayer({ id, embed, thumb, title, blocked }: VideoPlayerProps) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [refused, setRefused] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (refused) return
    const listen = (e: MessageEvent) => {
      let host = ''
      try {
        host = new URL(e.origin).hostname
      } catch {
        return
      }
      if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return
      try {
        if (JSON.parse(String(e.data)).event === 'onError') setRefused(true)
      } catch {
        /* not a player message */
      }
    }
    window.addEventListener('message', listen)
    return () => window.removeEventListener('message', listen)
  }, [refused])

  if (refused) {
    return (
      <div className={styles.blocked}>
        <img src={thumb} alt="" className={styles.bg} />
        <div className={styles.box}>
          <span className={styles.title}>{blocked.title}</span>
          <span className={styles.text}>{sent ? blocked.sentLabel : blocked.text}</span>
          <div className={styles.actions}>
            {blocked.targets.map((tg) => (
              <button
                key={tg.label}
                className={styles.button}
                onClick={() => {
                  tg.onPress(id)
                  setSent(true)
                }}
              >
                <Icon name={tg.icon} size={20} filled />
                {tg.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }
  return (
    <iframe
      ref={frame}
      className={styles.frame}
      src={embed}
      title={title}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      onLoad={() => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'paddock', channel: 'widget' }), '*')}
    />
  )
}

export interface VideoOverlayProps extends VideoPlayerProps {
  closeLabel: string
  onClose: () => void
  /** Called every 20 s while open (keeps the screensaver away during a video) */
  keepAwake?: () => void
  /** Called when the video opens; the returned function runs when it closes (e.g. sound up, then back down) */
  onOpen?: () => () => void
}

/** The video over the whole screen (outside the scaled stage), with a close button. */
export function VideoOverlay({ closeLabel, onClose, keepAwake, onOpen, ...video }: VideoOverlayProps) {
  const { layer } = useStage()
  useEffect(() => onOpen?.(), [onOpen])
  // Nothing of the app is painted under the video: the player gets the whole (modest) tablet GPU and CPU
  useEffect(() => {
    if (!layer) return
    layer.dataset.video = ''
    return () => {
      delete layer.dataset.video
    }
  }, [layer])
  useEffect(() => {
    if (!keepAwake) return
    keepAwake()
    const timer = setInterval(keepAwake, 20000)
    return () => clearInterval(timer)
  }, [keepAwake])
  if (!layer) return null
  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.screen}>
        <VideoPlayer {...video} />
      </div>
      <button className={styles.close} aria-label={closeLabel} title={closeLabel} onClick={onClose}>
        <Icon name="close" size={30} />
      </button>
    </div>,
    layer,
  )
}
