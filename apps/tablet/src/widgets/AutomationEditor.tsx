import { useEffect, useRef, useState } from 'react'
import { ChipChoice, CloseButton, Icon, Segmented, Sheet } from '@paddock/ui'
import {
  actionFor,
  activeDays,
  automationProblems,
  COVER_POSITIONS,
  sameAction,
  withAction,
  withDay,
  type ActionKind,
  type AutomatableDevice,
  type Automation,
  type Trigger,
  type Weekday,
} from '@paddock/core'
import { t } from '../i18n'
import { deleteAutomation, saveAutomation } from '../stores/automations.store'
import styles from './AutomationEditor.module.css'

const ICONS = ['bolt', 'logout', 'login', 'bedtime', 'wb_sunny', 'wb_twilight', 'schedule', 'blinds', 'lightbulb', 'valve', 'park', 'movie', 'flight_takeoff', 'home']
const DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
const OFFSETS = [-60, -30, -15, 0, 15, 30, 60]

interface Choice {
  id: string
  label: string
  do: ActionKind
  value?: number
}

/** Chips offered for a device: one per thing an automation can do with it. */
function choices(device: AutomatableDevice): Choice[] {
  return device.choices.flatMap((kind): Choice[] =>
    kind === 'position'
      ? COVER_POSITIONS.map((value) => ({ id: `position-${value}`, label: t(value <= 20 ? 'automations.do.ajar' : 'automations.do.position', { n: value }), do: kind, value }))
      : [{ id: kind, label: t(`automations.do.${kind}`), do: kind }],
  )
}

/** Create or change a mode or a schedule: name, when it runs, what each device does. */
export function AutomationEditor({ initial, devices, onClose }: { initial: Automation; devices: AutomatableDevice[]; onClose: () => void }) {
  const [draft, setDraftState] = useState(initial)
  const [error, setError] = useState('')
  // any change answers the last message
  const setDraft = (next: Automation) => {
    setError('')
    setDraftState(next)
  }
  const [saving, setSaving] = useState(false)
  // an existing automation opens on its first device, not on the top of a long list
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => list.current?.querySelector(`.${styles.deviceOn}`)?.scrollIntoView({ block: 'center' }), [])
  const trigger = draft.trigger
  const groups = [...new Set(devices.map((d) => d.group))]

  const setTrigger = (next: Trigger) => setDraft({ ...draft, trigger: next })
  const days = trigger.type === 'manual' ? undefined : trigger.days
  const setKind = (kind: string) => {
    if (kind === trigger.type) return
    if (kind === 'manual') setTrigger({ type: 'manual' })
    if (kind === 'time') setTrigger({ type: 'time', at: '07:00', days })
    if (kind === 'sun') setTrigger({ type: 'sun', event: 'sunset', offset: 0, days })
    if (kind === 'presence') setTrigger({ type: 'presence', event: 'everyone_left', days })
  }

  async function save() {
    const problems = automationProblems(draft)
    if (problems.length) return setError(t(`automations.problem.${problems[0]}`))
    setSaving(true)
    const refused = await saveAutomation({ ...draft, name: draft.name.trim() })
    setSaving(false)
    if (refused) return setError(t('automations.problem.refused', { reason: refused }))
    onClose()
  }

  return (
    <Sheet onClose={onClose} className={styles.sheet}>
      <header className={styles.header}>
        <h2>{t(initial.id ? 'automations.edit' : trigger.type === 'manual' ? 'automations.newMode' : 'automations.newSchedule')}</h2>
        <CloseButton label={t('common.close')} onPress={onClose} />
      </header>

      <div className={styles.body}>
        <section className={styles.settings}>
          <label className={styles.label} htmlFor="pd-automation-name">
            {t('automations.name')}
          </label>
          <input
            id="pd-automation-name"
            className={styles.input}
            value={draft.name}
            maxLength={40}
            autoComplete="off"
            placeholder={t(trigger.type === 'manual' ? 'automations.namePlaceholderMode' : 'automations.namePlaceholderSchedule')}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />

          <span className={styles.label}>{t('automations.icon')}</span>
          <div className={styles.icons}>
            {ICONS.map((icon) => (
              <button key={icon} aria-pressed={draft.icon === icon} className={draft.icon === icon ? `${styles.icon} ${styles.iconOn}` : styles.icon} onClick={() => setDraft({ ...draft, icon })}>
                <Icon name={icon} size={22} filled={draft.icon === icon} />
              </button>
            ))}
          </div>

          <span className={styles.label}>{t('automations.when')}</span>
          <Segmented
            stretch
            compact
            size="sm"
            value={trigger.type}
            onChange={setKind}
            options={[
              { id: 'manual', label: t('automations.trigger.manual'), icon: 'touch_app' },
              { id: 'time', label: t('automations.trigger.time'), icon: 'schedule' },
              { id: 'sun', label: t('automations.trigger.sun'), icon: 'wb_twilight' },
              { id: 'presence', label: t('automations.trigger.presence'), icon: 'directions_walk' },
            ]}
          />

          {trigger.type === 'manual' && <p className={styles.hint}>{t('automations.hint.manual')}</p>}

          {trigger.type === 'time' && (
            <>
              <div className={styles.times}>
                <label className={styles.time}>
                  <span>{t('automations.at')}</span>
                  <input type="time" className={styles.input} value={trigger.at} onChange={(e) => setTrigger({ ...trigger, at: e.target.value })} />
                </label>
                <label className={styles.time}>
                  <span>{t('automations.until')}</span>
                  <input type="time" className={styles.input} value={trigger.end ?? ''} onChange={(e) => setTrigger({ ...trigger, end: e.target.value || undefined })} />
                </label>
              </div>
              <p className={styles.hint}>{t(trigger.end ? 'automations.hint.range' : 'automations.hint.time')}</p>
            </>
          )}

          {trigger.type === 'sun' && (
            <>
              <Segmented
                stretch
                size="sm"
                value={trigger.event}
                onChange={(event) => setTrigger({ ...trigger, event: event as 'sunrise' | 'sunset' })}
                options={[
                  { id: 'sunrise', label: t('automations.sunrise') },
                  { id: 'sunset', label: t('automations.sunset') },
                ]}
              />
              <ChipChoice
                options={OFFSETS.map((m) => ({ id: String(m), label: m === 0 ? t('automations.offset.none') : t(m < 0 ? 'automations.offset.before' : 'automations.offset.after', { n: Math.abs(m) }) }))}
                selected={[String(trigger.offset)]}
                onPress={(id) => setTrigger({ ...trigger, offset: Number(id) })}
              />
            </>
          )}

          {trigger.type === 'presence' && (
            <Segmented
              stretch
              size="sm"
              value={trigger.event}
              onChange={(event) => setTrigger({ ...trigger, event: event as 'everyone_left' | 'someone_arrived' })}
              options={[
                { id: 'everyone_left', label: t('automations.everyoneLeft') },
                { id: 'someone_arrived', label: t('automations.someoneArrived') },
              ]}
            />
          )}

          {trigger.type !== 'manual' && (
            <>
              <span className={styles.label}>{t('automations.days')}</span>
              <ChipChoice
                shape="round"
                options={DAYS.map((d) => ({ id: String(d), label: t(`automations.day.${d}`) }))}
                selected={activeDays(trigger).map(String)}
                onPress={(id) => setTrigger(withDay(trigger.days?.length ? trigger : { ...trigger, days: [...DAYS] }, Number(id) as Weekday))}
              />
            </>
          )}
        </section>

        <section className={styles.devices}>
          <span className={styles.label}>{t('automations.what')}</span>
          <div className={styles.list} ref={list}>
            {groups.map((group) => (
              <div key={group} className={styles.group}>
                <span className={styles.groupName}>{group}</span>
                {devices
                  .filter((d) => d.group === group)
                  .map((device) => {
                    const current = actionFor(draft, device.entity)
                    const options = choices(device)
                    return (
                      <div key={device.entity} className={current ? `${styles.device} ${styles.deviceOn}` : styles.device}>
                        <Icon name={device.icon} size={22} filled={!!current} />
                        <span className={styles.deviceName}>{device.name}</span>
                        <ChipChoice
                          options={options}
                          selected={options.filter((o) => sameAction(current, o.do, o.value)).map((o) => o.id)}
                          onPress={(id) => {
                            const o = options.find((x) => x.id === id)!
                            // a second press on the chosen chip leaves the device alone
                            setDraft(withAction(draft, device.entity, sameAction(current, o.do, o.value) ? null : { do: o.do, value: o.value }))
                          }}
                        />
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        {initial.id && (
          <button
            className={styles.delete}
            onClick={() => {
              deleteAutomation(initial.id!)
              onClose()
            }}
          >
            <Icon name="delete" size={20} />
            {t('automations.delete')}
          </button>
        )}
        <span className={styles.error}>{error}</span>
        {draft.actions.length > 0 && <span className={styles.count}>{t('automations.count', { n: draft.actions.length })}</span>}
        <button className={styles.save} disabled={saving} onClick={save}>
          {t('automations.save')}
        </button>
      </footer>
    </Sheet>
  )
}
