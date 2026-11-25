import { SummaryCard } from '@paddock/ui'
import { UNKNOWN_STATES } from '@paddock/core'
import { config } from '../config'
import { formatTime, t } from '../i18n'
import { useEntity } from '../stores/hass.store'

export function SummaryWidget() {
  const entity = useEntity(config.home.summary)
  const text = entity && ![...UNKNOWN_STATES, ''].includes(entity.state) ? entity.state : ''
  return (
    <SummaryCard
      title={t('home.summary')}
      time={text && entity ? formatTime(new Date(entity.last_changed)) : ''}
      text={text || t('home.summaryEmpty', { entity: config.home.summary ?? 'input_text' })}
    />
  )
}
