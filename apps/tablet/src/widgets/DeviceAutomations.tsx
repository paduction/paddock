import { AutomationBadge } from '@paddock/ui'
import { automationsFor } from '@paddock/core'
import { t } from '../i18n'
import { openAutomation, showAutomationsOf, useAutomations } from '../stores/automations.store'
import { momentText } from './automationTexts'

/**
 * Badge for a device tile: says that automations drive this device and opens them.
 * One automation: its moment ("06:00 → 08:00") or its name, a press opens it.
 * Several: their number, a press shows them in the Automations tab.
 * Renders nothing when the device is in no automation. Place it over the tile (it is not part of the tile's own gestures).
 */
export function DeviceAutomations({ entity, name, compact = false, className }: { entity: string; name: string; compact?: boolean; className?: string }) {
  const items = useAutomations((s) => s.items)
  const mine = automationsFor(items, entity)
  if (!mine.length) return null
  const single = mine.length === 1 ? mine[0] : null
  const label = single ? (compact ? '' : momentText(single.trigger) || single.name) : compact ? String(mine.length) : t('automations.badge.many', { n: mine.length })
  return (
    <span className={className}>
      <AutomationBadge
        compact={compact}
        label={label}
        paused={mine.every((a) => !a.enabled)}
        title={t('automations.badge.title', { names: mine.map((a) => a.name).join(', ') })}
        onPress={() => (single ? openAutomation(single) : showAutomationsOf({ entity, name }))}
      />
    </span>
  )
}
