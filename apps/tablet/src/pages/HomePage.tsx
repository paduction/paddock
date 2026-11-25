import { AlertsWidget } from '../widgets/AlertsWidget'
import { GateWidget } from '../widgets/GateWidget'
import { QuickActionsWidget } from '../widgets/QuickActionsWidget'
import { SummaryWidget } from '../widgets/SummaryWidget'
import { ThermostatWidget } from '../widgets/ThermostatWidget'
import styles from './HomePage.module.css'

export function HomePage() {
  return (
    <div className={styles.page}>
      <AlertsWidget />
      <SummaryWidget />
      <div className={styles.main}>
        <ThermostatWidget />
        <GateWidget />
      </div>
      <div className={styles.quick}>
        <QuickActionsWidget />
      </div>
    </div>
  )
}
