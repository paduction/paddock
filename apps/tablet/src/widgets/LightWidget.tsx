import { LightTile } from '@paddock/ui'
import type { LightConfig } from '@paddock/core'
import { t } from '../i18n'
import { useLightList, useLights } from '../stores/lights.store'
import { WithAutomations } from './WithAutomations'

/** One light tile, connected to Home Assistant. */
export function LightWidget({ cfg, size }: { cfg: LightConfig; size?: 'normal' | 'large' }) {
  const [light] = useLightList([cfg])
  const toggle = useLights((s) => s.toggle)
  const setLevel = useLights((s) => s.setLevel)

  const state = !light.available ? 'offline' : light.on ? 'on' : 'off'
  const status = state === 'offline' ? t('light.offline') : t(state === 'on' ? 'light.on' : 'light.off') + (light.occupied ? t('light.presence') : '')

  return (
    <WithAutomations entity={cfg.entity} name={cfg.name} place="light">
      <LightTile
        name={light.name}
        icon={light.icon}
        status={status}
        state={state}
        level={light.brightness}
        onToggle={() => toggle(light)}
        onLevelChange={(level, phase) => setLevel(light, level, phase)}
        size={size}
      />
    </WithAutomations>
  )
}
