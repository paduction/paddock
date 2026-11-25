import { Clock } from '@paddock/ui'
import { formatLongDate, formatTime } from '../i18n'
import { useMinute } from '../stores/clock.store'

export function ClockWidget() {
  const minute = useMinute()
  const now = new Date(minute * 60000)
  return <Clock time={formatTime(now)} date={formatLongDate(now)} />
}
