import { useState } from 'react'
import { Icon, ModeTile, ScheduleRow } from '@paddock/ui'
import { automationsFor, isMode, newAutomation, type Automation } from '@paddock/core'
import { t } from '../i18n'
import { openAutomation, runAutomation, saveAutomation, showAutomationsOf, useAutomations } from '../stores/automations.store'
import { automationDevices } from '../widgets/AutomationOverlays'
import { whatText, whenText } from '../widgets/automationTexts'
import styles from './AutomationsPage.module.css'

/** Modes (buttons) on the left, schedules and triggers on the right; both edited in place. */
export function AutomationsPage() {
  const all = useAutomations((s) => s.items)
  const status = useAutomations((s) => s.status)
  const filter = useAutomations((s) => s.filter)
  const [started, setStarted] = useState<string | null>(null)
  const devices = automationDevices()
  const items = filter ? automationsFor(all, filter.entity) : all
  const modes = items.filter(isMode)
  const schedules = items.filter((a) => !isMode(a))
  const setEditing = openAutomation

  async function run(automation: Automation) {
    if (!(await runAutomation(automation.id!))) return
    setStarted(automation.id!)
    setTimeout(() => setStarted((current) => (current === automation.id ? null : current)), 2500)
  }

  return (
    <div className={filter ? `${styles.page} ${styles.filtered}` : styles.page}>
      {filter && (
        <button className={styles.filter} onClick={() => showAutomationsOf(null)}>
          {t('automations.filter', { name: filter.name })}
          <Icon name="close" size={18} />
        </button>
      )}
      <section className={styles.column}>
        <header className={styles.header}>
          <span className={styles.title}>{t('automations.modes')}</span>
          <button className={styles.add} onClick={() => setEditing(newAutomation('mode'))}>
            <Icon name="add" size={22} />
            {t('automations.addMode')}
          </button>
        </header>
        {modes.length ? (
          <div className={styles.modes}>
            {modes.map((a) => (
              <ModeTile
                key={a.id}
                name={a.name}
                icon={a.icon}
                summary={whatText(a, devices)}
                feedback={started === a.id ? t('automations.started') : null}
                editLabel={t('automations.edit')}
                onRun={() => run(a)}
                onEdit={() => setEditing(a)}
              />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>{t(status === 'unsupported' ? 'automations.unsupported' : status === 'loading' ? 'automations.loading' : 'automations.noModes')}</p>
        )}
      </section>

      <section className={styles.column}>
        <header className={styles.header}>
          <span className={styles.title}>{t('automations.schedules')}</span>
          <button className={styles.add} onClick={() => setEditing(newAutomation('schedule'))}>
            <Icon name="add" size={22} />
            {t('automations.addSchedule')}
          </button>
        </header>
        {schedules.length ? (
          <div className={styles.schedules}>
            {schedules.map((a) => (
              <ScheduleRow
                key={a.id}
                name={a.name}
                icon={a.icon}
                when={whenText(a.trigger)}
                what={whatText(a, devices)}
                enabled={a.enabled}
                toggleLabel={t('automations.enabled')}
                onToggle={() => saveAutomation({ ...a, enabled: !a.enabled })}
                onEdit={() => setEditing(a)}
              />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>{t(status === 'unsupported' ? 'automations.unsupported' : status === 'loading' ? 'automations.loading' : 'automations.noSchedules')}</p>
        )}
      </section>
    </div>
  )
}
