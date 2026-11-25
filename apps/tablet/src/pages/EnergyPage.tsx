import { useEffect } from 'react'
import { BatteryCard, EnergyChart, ENERGY_CHART, PowerStat, RingGauge, useTween } from '@paddock/ui'
import { chartPaths, numericState, sumKwh } from '@paddock/core'
import { config } from '../config'
import { decimal, t } from '../i18n'
import { useMinute } from '../stores/clock.store'
import { refreshEnergy, useEnergy } from '../stores/energy.store'
import { useEntity } from '../stores/hass.store'
import styles from './EnergyPage.module.css'

export function EnergyPage() {
  const cfg = config.energy!
  const day = useEnergy((s) => s.day)
  const now = new Date(useMinute() * 60000)
  useEffect(refreshEnergy, [])

  const autonomySensor = numericState(useEntity(cfg.autonomy)) ?? 0
  const selfSensor = numericState(useEntity(cfg.selfConsumption)) ?? 0
  const battery = numericState(useEntity(cfg.battery)) ?? 0
  const chart = chartPaths(day, now, ENERGY_CHART.width, ENERGY_CHART.height)

  // Values count up from 0 when the tab opens
  const batteryKwh = useTween(battery, 200, 0.005, 0).value
  const solarNow = useTween(chart.solarNow, 200, 0.005, 0).value
  const gridNow = useTween(chart.gridNow, 200, 0.005, 0).value
  const capacity = cfg.batteryCapacityKwh
  const percent = capacity ? Math.max(0, Math.min(100, Math.round((batteryKwh / capacity) * 100))) : undefined

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <RingGauge label={t('energy.autonomy')} value={day?.autonomy ?? autonomySensor} />
        <RingGauge label={t('energy.selfConsumption')} value={day?.selfConsumption ?? selfSensor} />
        <BatteryCard title={t('energy.battery')} kwh={decimal(batteryKwh)} note={capacity ? t('energy.capacity', { n: capacity }) : (cfg.batteryNote ?? '')} percent={percent} />
        <div className={styles.stats}>
          <PowerStat title={t('energy.solar')} icon="solar_power" tone="accent" value={decimal(solarNow)} unit="kW" detail={t('energy.today', { n: decimal(day ? sumKwh(day.solar) : 0) })} />
          <PowerStat title={t('energy.grid')} icon="electric_bolt" tone="blue" value={decimal(gridNow)} unit="kW" detail={t('energy.today', { n: decimal(day ? sumKwh(day.grid) : 0) })} />
        </div>
      </div>
      <EnergyChart
        title={t('energy.chartTitle')}
        productionLabel={t('energy.production')}
        consumptionLabel={t('energy.consumption')}
        scaleLabel={`${chart.maxKw} kW`}
        production={chart.production}
        area={chart.area}
        consumption={chart.consumption}
        now={chart.now}
        hours={['0 h', '6 h', '12 h', '18 h', '24 h']}
      />
    </div>
  )
}
