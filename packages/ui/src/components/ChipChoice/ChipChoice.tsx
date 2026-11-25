import styles from './ChipChoice.module.css'

export interface ChipOption {
  id: string
  label: string
}

export interface ChipChoiceProps {
  options: ChipOption[]
  /** Ids of the selected chips */
  selected: string[]
  onPress: (id: string) => void
  /** 'round': one letter per chip (days of the week) */
  shape?: 'pill' | 'round'
}

/** A row of small chips: one or several can be selected; a press on a selected one is up to the caller. */
export function ChipChoice({ options, selected, onPress, shape = 'pill' }: ChipChoiceProps) {
  return (
    <div className={styles.chips}>
      {options.map((o) => {
        const on = selected.includes(o.id)
        return (
          <button key={o.id} aria-pressed={on} className={`${styles.chip} ${shape === 'round' ? styles.round : ''} ${on ? styles.on : ''}`} onClick={() => onPress(o.id)}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
