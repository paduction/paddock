import { GateCard } from '@paddock/ui'
import { isMoving, minutesOpen } from '@paddock/core'
import { config } from '../config'
import { t } from '../i18n'
import { useMinute } from '../stores/clock.store'
import { pressGate, useGate } from '../stores/gate.store'

export function GateWidget() {
  const gate = useGate()
  const now = useMinute() * 60000
  if (!gate) return null
  const moving = isMoving(gate)
  const open = gate.state === 'open'
  const minutes = minutesOpen(gate, now)

  return (
    <GateCard
      name={config.home.gate!.name}
      status={!gate.available ? t('gate.offline') : t(`gate.${gate.state}`)}
      since={open ? (minutes ? t('gate.since', { n: minutes }) : t('gate.justNow')) : moving ? t('gate.moving') : t('gate.closedDetail')}
      tone={open ? 'open' : moving ? 'moving' : 'closed'}
      icon={gate.state === 'closed' ? 'garage_door' : 'garage_door_open'}
      buttonLabel={gate.sent ? t('gate.sent') : moving ? t('gate.wait') : open ? t('gate.doClose') : t('gate.doOpen')}
      busy={gate.sent || moving}
      onPress={() => pressGate(gate)}
    />
  )
}
