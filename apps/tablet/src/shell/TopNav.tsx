import { TabBar } from '@paddock/ui'
import { t } from '../i18n'
import { useUi } from '../stores/ui.store'
import { PresenceWidget } from '../widgets/PresenceWidget'
import { TABS } from './tabs'
import styles from './Shell.module.css'

export function TopNav() {
  const view = useUi((s) => s.view)
  const go = useUi((s) => s.go)
  return (
    <header className={styles.nav}>
      <TabBar tabs={TABS.map((tab) => ({ id: tab.id, label: t(tab.label), icon: tab.icon }))} current={view} onSelect={(id) => go(id as typeof view)} />
      <PresenceWidget />
    </header>
  )
}
