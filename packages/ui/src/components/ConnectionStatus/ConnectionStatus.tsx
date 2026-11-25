import styles from './ConnectionStatus.module.css'

export function ConnectionStatus({ status, label }: { status: 'live' | 'pending' | 'error'; label: string }) {
  return (
    <div className={styles.status}>
      <span className={`${styles.dot} ${styles[status]}`} />
      <span>{label}</span>
    </div>
  )
}
