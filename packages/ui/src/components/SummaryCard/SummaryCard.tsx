import { Icon } from '../Icon/Icon'
import styles from './SummaryCard.module.css'

/** "Summary of the day" written by an automation (e.g. an AI). */
export function SummaryCard({ title, time, text }: { title: string; time?: string; text: string }) {
  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <Icon name="auto_awesome" size={20} filled />
        {title}
        <span className={styles.time}>{time}</span>
      </div>
      <p className={styles.text}>{text}</p>
    </section>
  )
}
