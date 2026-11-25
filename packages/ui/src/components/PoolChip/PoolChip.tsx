import { Icon } from '../Icon/Icon'
import styles from './PoolChip.module.css'

export function PoolChip({ label, temperature, onPress }: { label: string; temperature: string; onPress?: () => void }) {
  return (
    <button className={styles.chip} onClick={onPress}>
      <Icon name="pool" size={22} color="var(--pd-blue-text)" />
      <span className={styles.label}>{label}</span>
      <span className={styles.temperature}>{temperature}</span>
    </button>
  )
}
