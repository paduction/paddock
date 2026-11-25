import { Icon } from '@paddock/ui'
import { t } from '../i18n'
import type { MessageKey } from '../i18n/fr'
import styles from './PlaceholderPage.module.css'

/** Shown for a tab that has no screen yet. */
export function PlaceholderPage({ label, icon }: { label: MessageKey; icon: string }) {
  return (
    <div className={styles.page}>
      <Icon name={icon} size={64} color="var(--pd-text-3)" />
      <div className={styles.title}>{t(label)}</div>
      <div className={styles.text}>{t('page.notMigrated')}</div>
    </div>
  )
}
