import { useState } from 'react'
import { Icon, ModeTile, ScheduleRow } from '@paddock/ui'
import { activeDays, automatableDevices, isMode, newAutomation, type AutomatableDevice, type Automation, type Trigger } from '@paddock/core'
import { config } from '../config'
import { t } from '../i18n'
import { runAutomation, saveAutomation, useAutomations } from '../stores/automations.store'
import { AutomationEditor } from '../widgets/AutomationEditor'
import styles from './AutomationsPage.module.css'

/** "Mon – Fri", "Weekend", "Every day", or the days one by one. */
function daysText(trigger: Trigger): string {
  const days = activeDays(trigger)
  const key = days.join('')
  if (days.length === 7) return t('automations.everyDay')
  if (key === '01234') return t('automations.weekdays')
  if (key === '56') return t('automations.weekend')
  return days.map((d) => t(`automations.dayShort.${d}`)).join(' ')
}

function whenText(trigger: Trigger): string {
  if (trigger.type === 'manual') return ''
  const offset = (minutes: number) => (minutes === 0 ? '' : ` ${minutes > 0 ? '+' : '−'}${Math.abs(minutes)} min`)
  const moment =
    trigger.type === 'time'
      ? trigger.end
        ? `${trigger.at} → ${trigger.end}`
        : trigger.at
      : trigger.type === 'sun'
        ? t(trigger.event === 'sunrise' ? 'automations.sunrise' : 'automations.sunset') + offset(trigger.offset)
        : t(trigger.event === 'everyone_left' ? 'automations.everyoneLeft' : 'automations.someoneArrived')
  return `${daysText(trigger)} · ${moment}`
}

/** One device: "Pump · Turn on"; several: "3 shutters · 2 lights". */
function whatText(automation: Automation, devices: AutomatableDevice[]): string {
  const known = automation.actions.map((a) => ({ action: a, device: devices.find((d) => d.entity === a.entity) })).filter((x) => x.device)
  if (!known.length) return t('automations.nothing')
  if (known.length === 1) {
    const { action, device } = known[0]
    const what = action.do === 'position' ? t((action.value ?? 0) <= 20 ? 'automations.do.ajar' : 'automations.do.position', { n: action.value ?? 0 }) : t(`automations.do.${action.do}`)
    return `${device!.name} · ${what}`
  }
  const count = (kinds: AutomatableDevice['kind'][]) => known.filter((x) => kinds.includes(x.device!.kind)).length
  const parts: string[] = []
  if (count(['cover', 'gate'])) parts.push(t('automations.covers', { n: count(['cover', 'gate']) }))
  if (count(['light'])) parts.push(t('automations.lights', { n: count(['light']) }))
  if (count(['switch', 'scene'])) parts.push(t('automations.others', { n: count(['switch', 'scene']) }))
  return parts.join(' · ')
}

/** Modes (buttons) on the left, schedules and triggers on the right; both edited in place. */
export function AutomationsPage() {
  const items = useAutomations((s) => s.items)
  const status = useAutomations((s) => s.status)
  const [editing, setEditing] = useState<Automation | null>(null)
  const [started, setStarted] = useState<string | null>(null)
  const devices = automatableDevices(config, {
    scenes: t('automations.group.scenes'),
    outdoor: t('automations.group.outdoor'),
    cinema: t('automations.group.amplifier'),
    gate: t('automations.group.gate'),
  })
  const modes = items.filter(isMode)
  const schedules = items.filter((a) => !isMode(a))

  async function run(automation: Automation) {
    if (!(await runAutomation(automation.id!))) return
    setStarted(automation.id!)
    setTimeout(() => setStarted((current) => (current === automation.id ? null : current)), 2500)
  }

  return (
    <div className={styles.page}>
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

      {editing && <AutomationEditor key={editing.id ?? 'new'} initial={editing} devices={devices} onClose={() => setEditing(null)} />}
    </div>
  )
}
