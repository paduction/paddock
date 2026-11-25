import { ThermostatCard } from '@paddock/ui'
import { availablePresets, HVAC_MODES, isHeating, RULER } from '@paddock/core'
import { config } from '../config'
import { decimal, t } from '../i18n'
import type { MessageKey } from '../i18n/fr'
import { climate, useThermostat } from '../stores/climate.store'

const MODE_ICONS: Record<string, string> = { heat: 'local_fire_department', off: 'power_settings_new', auto: 'schedule' }
const PRESET_ICONS: Record<string, string> = { away: 'ac_unit', eco: 'eco', comfort: 'sunny', boost: 'bolt' }

function presetName(preset: string | null): string {
  if (!preset) return '—'
  const key = `preset.${preset}` as MessageKey
  const label = t(key)
  return label === key ? preset.charAt(0).toUpperCase() + preset.slice(1) : label
}

export function ThermostatWidget() {
  const th = useThermostat()
  if (!th) return null
  const heating = isHeating(th)
  const status = !th.available
    ? t('climate.offline')
    : th.mode === 'off'
      ? t('climate.stopped')
      : heating
        ? t('climate.heating')
        : th.usesPresets
          ? t('climate.idle')
          : t('climate.reached')

  return (
    <ThermostatCard
      name={config.home.climate!.name}
      modes={HVAC_MODES.map((m) => ({ id: m, label: t(`climate.${m}`), icon: MODE_ICONS[m], active: th.mode === m }))}
      onMode={climate.setMode}
      current={th.current}
      target={th.target}
      format={(v) => decimal(v)}
      status={status}
      heating={heating}
      off={th.mode === 'off'}
      presetLabel={th.usesPresets ? presetName(th.preset) : undefined}
      setpointCaption={t(th.usesPresets ? 'climate.mode' : 'climate.setpoint')}
      onStep={(dir) => climate.step(th, dir)}
      ruler={th.usesPresets ? undefined : { from: RULER.min, to: RULER.max, min: th.min, max: th.max, onChange: (v) => climate.setTarget(th, v) }}
      presets={
        th.usesPresets
          ? availablePresets(th).map((p) => ({ id: p, label: presetName(p), icon: PRESET_ICONS[p], active: th.preset === p }))
          : undefined
      }
      onPreset={(p) => climate.setPreset(th, p)}
    />
  )
}
