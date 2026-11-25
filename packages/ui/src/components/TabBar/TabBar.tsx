import { Icon } from '../Icon/Icon'
import styles from './TabBar.module.css'

export interface Tab {
  id: string
  label: string
  icon: string
}

export interface TabBarProps {
  tabs: Tab[]
  current: string
  onSelect: (id: string) => void
}

const TAB_WIDTH = 64

/** Icon-only navigation capsule with a sliding highlight. */
export function TabBar({ tabs, current, onSelect }: TabBarProps) {
  const index = Math.max(0, tabs.findIndex((t) => t.id === current))
  return (
    <nav className={styles.bar} style={{ gridTemplateColumns: `repeat(${tabs.length}, ${TAB_WIDTH}px)` }}>
      <span className={styles.highlight} style={{ transform: `translateX(${index * TAB_WIDTH}px)` }} />
      {tabs.map((tab) => {
        const active = tab.id === current
        return (
          <button
            key={tab.id}
            title={tab.label}
            aria-current={active ? 'page' : undefined}
            className={active ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => onSelect(tab.id)}
          >
            <Icon name={tab.icon} size={24} filled={active} />
          </button>
        )
      })}
    </nav>
  )
}
