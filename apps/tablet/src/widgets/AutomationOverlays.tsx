import { automatableDevices } from '@paddock/core'
import { config } from '../config'
import { t } from '../i18n'
import { closeAutomation, useAutomations } from '../stores/automations.store'
import { AutomationEditor } from './AutomationEditor'

/** Devices automations can act on, with the translated names of the families that have no room. */
export const automationDevices = () =>
  automatableDevices(config, {
    scenes: t('automations.group.scenes'),
    outdoor: t('automations.group.outdoor'),
    cinema: t('automations.group.amplifier'),
    gate: t('automations.group.gate'),
  })

/** The editor, over any page: opened from the Automations tab or from the badge of a device tile. */
export function AutomationOverlays() {
  const editing = useAutomations((s) => s.editing)
  if (!editing) return null
  return <AutomationEditor key={editing.id ?? 'new'} initial={editing} devices={automationDevices()} onClose={closeAutomation} />
}
