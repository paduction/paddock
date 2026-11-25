import { PresenceChip, type Avatar } from '@paddock/ui'
import { homeSummary, toPerson } from '@paddock/core'
import { useShallow } from 'zustand/react/shallow'
import { config } from '../config'
import { t } from '../i18n'
import { useHass } from '../stores/hass.store'
import { overlays } from './SidebarOverlays'

export function PresenceWidget() {
  const entities = useHass(useShallow((s) => config.people.map((p) => s.entities[p.entity])))
  const people = config.people.map((cfg, i) => toPerson(cfg, entities[i]))
  const avatars: Avatar[] = people.map((p) => ({
    initial: p.initial,
    title: `${p.name} · ${t(!p.tracked ? 'people.untracked' : p.home ? 'people.home' : 'people.away')}`,
    status: !p.tracked ? 'untracked' : p.home ? 'home' : 'away',
  }))
  const summary = homeSummary(people)
  const label =
    summary.kind === 'nobody' ? t('people.nobody')
    : summary.kind === 'everyone' ? t('people.everyone')
    : summary.kind === 'one' ? t('people.one', { name: summary.name })
    : t('people.some', { n: summary.count })
  return <PresenceChip avatars={avatars} label={label} someoneHome={summary.kind !== 'nobody'} onPress={overlays.people} />
}
