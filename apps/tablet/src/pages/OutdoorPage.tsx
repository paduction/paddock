import { PoolCard, SwitchTile, useTween } from '@paddock/ui'
import { numericState } from '@paddock/core'
import { config } from '../config'
import { decimal, t } from '../i18n'
import { toggleDevice, useDevices } from '../stores/devices.store'
import { useEntity } from '../stores/hass.store'
import styles from './OutdoorPage.module.css'

export function OutdoorPage() {
  const cfg = config.outdoor!
  const pool = numericState(useEntity(cfg.pool))
  const shownPool = useTween(pool ?? 0, 500, 0.005).value
  const all = [...(cfg.poolDevice ? [cfg.poolDevice] : []), ...cfg.devices]
  const states = useDevices(all)
  const stateOf = (i: number) => states[i]
  const offset = cfg.poolDevice ? 1 : 0

  return (
    <div className={styles.page}>
      <div className={styles.column}>
        <span className={styles.title}>{t('outdoor.pool')}</span>
        <PoolCard label={t('outdoor.water')} temperature={pool === null ? '—' : decimal(shownPool)} />
        {cfg.poolDevice && (
          <div className={styles.pump}>
            <SwitchTile
              name={cfg.poolDevice.name}
              icon={cfg.poolDevice.icon}
              on={stateOf(0)}
              status={stateOf(0) ? cfg.poolDevice.on : cfg.poolDevice.off}
              onToggle={() => toggleDevice(cfg.poolDevice!, stateOf(0))}
            />
          </div>
        )}
      </div>
      <div className={styles.column}>
        <span className={styles.title}>{t('outdoor.title')}</span>
        {cfg.devices.map((d, i) => (
          <div key={d.entity} className={styles.device}>
            <SwitchTile size="large" name={d.name} icon={d.icon} on={stateOf(i + offset)} status={stateOf(i + offset) ? d.on : d.off} onToggle={() => toggleDevice(d, stateOf(i + offset))} />
          </div>
        ))}
      </div>
    </div>
  )
}
