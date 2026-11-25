import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import styles from './Stage.module.css'

/**
 * Fixed-height canvas (800 px) scaled to fill the screen, like a game viewport.
 * Width adapts to the screen ratio (1200–1700 px), so layouts are designed once at 800 px high.
 */
export const STAGE_HEIGHT = 800

interface StageMetrics {
  scale: number
  width: number
  x: number
  y: number
  /** Full-screen layer outside the scaled stage (real fullscreen overlays) */
  layer?: HTMLElement | null
}

function measure(): StageMetrics {
  const w = window.innerWidth
  const h = window.innerHeight
  const scale = w / h >= 1.5 ? h / STAGE_HEIGHT : w / 1200
  const width = Math.max(1200, Math.min(1700, Math.ceil(w / scale)))
  return { scale, width, x: Math.floor((w - width * scale) / 2), y: Math.floor((h - STAGE_HEIGHT * scale) / 2) }
}

const StageContext = createContext<StageMetrics>({ scale: 1, width: 1200, x: 0, y: 0 })

/** Current stage scale and width (e.g. to size overlays drawn outside the stage). */
export const useStage = () => useContext(StageContext)

export interface StageProps {
  theme: 'dark' | 'light'
  dimmed?: boolean
  background?: string
  onActivity?: () => void
  children: ReactNode
}

export function Stage({ theme, dimmed = false, background, onActivity, children }: StageProps) {
  const [metrics, setMetrics] = useState(measure)
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const onResize = () => setMetrics(measure())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <StageContext.Provider value={{ ...metrics, layer }}>
      <div ref={setLayer} data-theme={theme} className={styles.viewport} onPointerDownCapture={onActivity}>
        <div
          className={styles.stage}
          style={{
            left: metrics.x,
            top: metrics.y,
            width: metrics.width,
            transform: `scale(${metrics.scale})`,
            background,
            filter: dimmed ? 'brightness(0.42) saturate(0.7) sepia(0.2)' : 'none',
          }}
        >
          {children}
        </div>
      </div>
    </StageContext.Provider>
  )
}
