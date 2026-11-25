import { cva } from 'class-variance-authority'
import { Icon } from '../Icon/Icon'
import styles from './CinemaHero.module.css'

export interface CinemaStep {
  label: string
  done: boolean
}

export interface CinemaHeroProps {
  title: string
  hint: string
  status: 'off' | 'starting' | 'on'
  steps: CinemaStep[]
  onToggle: () => void
}

const hero = cva(styles.hero, { variants: { status: { off: styles.off, starting: styles.starting, on: styles.on } } })

/** Big "cinema mode" button with the progress of each step. */
export function CinemaHero({ title, hint, status, steps, onToggle }: CinemaHeroProps) {
  return (
    <button className={hero({ status })} onClick={onToggle}>
      <div className={styles.top}>
        <div className={styles.iconCircle}>
          <Icon name="movie" size={34} filled />
        </div>
        <span className={styles.pill}>{hint}</span>
      </div>
      <div className={styles.bottom}>
        <div className={styles.title}>{title}</div>
        <div className={styles.steps}>
          {steps.map((s) => (
            <span key={s.label} className={status === 'on' ? styles.stepActive : s.done ? styles.stepDone : styles.step}>
              <Icon name={s.done || status === 'on' ? 'check_circle' : 'radio_button_unchecked'} size={18} filled />
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
